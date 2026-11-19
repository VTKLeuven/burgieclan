<?php

namespace App\Tests\Api;

use App\Entity\User;
use App\Factory\UserFactory;
use App\Service\StudyPlanner\IcsParser;
use App\Service\StudyPlanner\StudyPlannerSync;
use App\Service\StudyPlanner\VtkEvents;
use App\Service\VtkService\VtkServiceSignature;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\NullLogger;
use Symfony\Component\Cache\Adapter\ArrayAdapter;
use Symfony\Component\HttpClient\MockHttpClient;
use Symfony\Component\HttpClient\Response\MockResponse;
use Zenstruck\Browser\KernelBrowser;

/**
 * The study planner as the VTK app reaches it: the VTK website speaking for a member with a
 * signed header (VtkServiceAuthenticator), and the VTK events put in the planner.
 */
class StudyPlannerVtkTest extends ApiTestCase
{
    private const LINK = 'webcal://cloud.timeedit.net/be_kuleuven/web/public/s.ics?sid=7&type=student&value=abc';

    /** @var array<string, array<string, mixed>> what the mock VTK website publishes, by id */
    private array $published = [];

    /** @var list<string> */
    private array $vtkRequests = [];

    private function browserWithMocks(): KernelBrowser
    {
        $browser = $this->browser();
        $browser->client()->disableReboot();

        $timeedit = new MockHttpClient(
            static fn (): MockResponse => new MockResponse(
                implode(
                    "\r\n",
                    [
                    'BEGIN:VCALENDAR', 'VERSION:2.0',
                    'BEGIN:VEVENT', 'UID:l1@timeedit.com', 'DTSTART:20261123T083500Z', 'DTEND:20261123T103000Z',
                    'SUMMARY:H04A9a Power System Calculations: Lecture', 'LOCATION:aula C', 'DESCRIPTION:01 College', 'END:VEVENT',
                    'END:VCALENDAR', '',
                    ]
                )
            )
        );
        $container = self::getContainer();
        $container->set(
            StudyPlannerSync::class,
            new StudyPlannerSync($timeedit, new IcsParser(), $container->get(EntityManagerInterface::class), new NullLogger())
        );

        $vtk = new MockHttpClient(
            function (string $method, string $url): MockResponse {
                $this->vtkRequests[] = $url;
                parse_str((string) parse_url($url, PHP_URL_QUERY), $query);
                $ids = isset($query['ids']) ? explode(',', (string) $query['ids']) : array_keys($this->published);
                $events = array_values(array_filter(array_map(fn (string $id) => $this->published[$id] ?? null, $ids)));

                return new MockResponse((string) json_encode(['events' => $events]));
            }
        );
        $container->set(VtkEvents::class, new VtkEvents($vtk, new ArrayAdapter(), new NullLogger(), 'http://vtk.test'));

        return $browser;
    }

    /**
     * A request as the VTK website signs it.
     *
     * @param array<string, mixed>|null $json
     *
     * @return array<string, mixed>
     */
    private function asVtk(KernelBrowser $browser, string $method, string $path, ?array $json = null, int $status = 200, array $identity = ['sub' => 'vtk-user-1', 'email' => 'r0123456@student.kuleuven.be', 'name' => 'Ada Lovelace'], ?string $secret = null): array
    {
        $body = null === $json ? '' : (string) json_encode($json);
        $user = rtrim(strtr(base64_encode((string) json_encode($identity)), '+/', '-_'), '=');
        $timestamp = time();
        // The signer of the container itself: VTK_SERVICE_SECRET may come from .env.test or from
        // the environment (docker-compose sets it), and the test must not care which.
        $signer = null === $secret ? self::getContainer()->get(VtkServiceSignature::class) : new VtkServiceSignature($secret);
        $signature = $signer->sign($method, $path, $timestamp, $user, $body);
        $browser->request(
            $method,
            $path,
            [
            'headers' => [
                'Content-Type' => 'application/ld+json',
                VtkServiceSignature::HEADER_USER => $user,
                VtkServiceSignature::HEADER_TIMESTAMP => (string) $timestamp,
                VtkServiceSignature::HEADER_SIGNATURE => $signature,
            ],
            'body' => $body,
            ]
        )->assertStatus($status);
        $content = $browser->content();

        return '' === $content ? [] : (json_decode($content, true) ?? []);
    }

    private function publish(string $id, string $start, string $end, array $extra = []): void
    {
        $this->published[$id] = array_merge(
            [
            'id' => $id,
            'slug' => $id . '-2026',
            'titleNl' => 'Cantus ' . $id,
            'titleEn' => null,
            'location' => 'Alma 2',
            'start' => $start,
            'end' => $end,
            'allDay' => false,
            'urlNl' => 'https://vtk.be/kalender/' . $id . '-2026',
            'urlEn' => 'https://vtk.be/en/kalender/' . $id . '-2026',
            'updatedAt' => '2026-11-01T10:00:00.000Z',
            'moments' => [],
            ],
            $extra
        );
    }

    /**
     * The same vector as test/burgieclanPlanning.test.ts in vtk-website-new: when the scheme
     * changes on one side only, one of the two fails instead of the VTK app getting silent 401s.
     */
    public function testSignatureMatchesTheVtkWebsite(): void
    {
        $user = 'eyJzdWIiOiJ1MSIsImVtYWlsIjoicjBAa3VsZXV2ZW4uYmUiLCJuYW1lIjoiQWRhIEzDtnZlbGFjZSJ9';
        $this->assertSame(
            'sha256=9b2dc7d92f29cf5c514af09feeb4b7d7f22e8e082e7246896ae71c58f2c29010',
            (new VtkServiceSignature(str_repeat('x', 40)))->sign('post', '/api/study_planner/operations', 1700000000, $user, '{"op":"done"}')
        );
    }

    public function testSignedRequestCreatesTheAccountOnce(): void
    {
        $browser = $this->browserWithMocks();

        $state = $this->asVtk($browser, 'GET', '/api/study_planner');
        $this->assertFalse($state['subscribed']);
        $this->asVtk($browser, 'GET', '/api/study_planner');

        $users = self::getContainer()->get(EntityManagerInterface::class)->getRepository(User::class)->findBy(['fluxusSub' => 'vtk-user-1']);
        $this->assertCount(1, $users);
        $this->assertSame('r0123456@student.kuleuven.be', $users[0]->getEmail());
    }

    public function testLinksAnExistingAccountByEmail(): void
    {
        UserFactory::createOne(['email' => 'r0999999@student.kuleuven.be']);
        $browser = $this->browserWithMocks();

        $this->asVtk($browser, 'GET', '/api/study_planner', identity: ['sub' => 'vtk-user-9', 'email' => 'r0999999@student.kuleuven.be', 'name' => 'X']);

        $users = self::getContainer()->get(EntityManagerInterface::class)->getRepository(User::class)->findBy(['email' => 'r0999999@student.kuleuven.be']);
        $this->assertCount(1, $users);
        $this->assertSame('vtk-user-9', $users[0]->getFluxusSub());
    }

    public function testRejectsAWrongSignature(): void
    {
        $browser = $this->browserWithMocks();
        $this->asVtk($browser, 'GET', '/api/study_planner', status: 401, secret: 'another-secret-of-at-least-32-characters');
    }

    public function testSignatureOnlyCountsForThePlanner(): void
    {
        $browser = $this->browserWithMocks();
        $this->asVtk($browser, 'GET', '/api/courses', status: 401);
    }

    public function testVtkEventsInPlannerAndCalendar(): void
    {
        $browser = $this->browserWithMocks();
        $this->publish('ev1', '2026-11-25T20:00:00.000Z', '2026-11-26T01:00:00.000Z');
        $this->publish(
            'week',
            '2026-11-30T17:00:00.000Z',
            '2026-12-02T19:00:00.000Z',
            ['titleNl' => 'Loopweek', 'moments' => [
                ['start' => '2026-11-30T17:00:00.000Z', 'end' => '2026-11-30T18:00:00.000Z', 'label' => 'Dag 1', 'location' => null],
                ['start' => '2026-12-02T18:00:00.000Z', 'end' => '2026-12-02T19:00:00.000Z', 'label' => 'Dag 2', 'location' => 'Sportkot'],
            ]]
        );

        // A planner needs its timetable first.
        $this->asVtk($browser, 'POST', '/api/study_planner/operations', ['op' => 'addVtkEvent', 'vtkEventId' => 'ev1'], 404);
        $this->asVtk($browser, 'POST', '/api/study_planner/subscription', ['icsUrl' => self::LINK]);

        $this->asVtk($browser, 'POST', '/api/study_planner/operations', ['op' => 'addVtkEvent', 'vtkEventId' => 'nope'], 404);
        $this->asVtk($browser, 'POST', '/api/study_planner/operations', ['op' => 'addVtkEvent', 'vtkEventId' => 'ev1']);
        $this->asVtk($browser, 'POST', '/api/study_planner/operations', ['op' => 'addVtkEvent', 'vtkEventId' => 'ev1']);
        $state = $this->asVtk($browser, 'POST', '/api/study_planner/operations', ['op' => 'addVtkEvent', 'vtkEventId' => 'week']);

        $this->assertCount(2, $state['vtkEvents']);
        [$cantus, $week] = $state['vtkEvents'];
        $this->assertSame('ev1', $cantus['id']);
        // 20:00 UTC is 21:00 in Leuven; past midnight the block stops at the end of the day.
        $this->assertSame(
            ['2026-11-25', '2026-11-26', '21:00', '02:00', 1260, 1440],
            [
            $cantus['occurrences'][0]['date'], $cantus['occurrences'][0]['endDate'], $cantus['occurrences'][0]['start'],
            $cantus['occurrences'][0]['end'], $cantus['occurrences'][0]['startMin'], $cantus['occurrences'][0]['endMin'],
            ]
        );
        $this->assertCount(2, $week['occurrences']);
        $this->assertSame('Dag 2', $week['occurrences'][1]['label']);
        $this->assertSame('Sportkot', $week['occurrences'][1]['location']);
        $this->assertSame('Alma 2', $week['occurrences'][0]['location']);

        // Just copied: reading the planner within the hour does not ask VTK again.
        $asked = count($this->vtkRequests);
        $this->asVtk($browser, 'GET', '/api/study_planner');
        $this->assertCount($asked, $this->vtkRequests);

        $picker = $this->asVtk($browser, 'GET', '/api/study_planner/vtk_events');
        $this->assertSame([true, true], array_column($picker['events'], 'inPlanner'));

        $browser->get('/api' . substr($state['feedPath'], 4))->assertStatus(200);
        $ics = $browser->content();
        $this->assertStringContainsString('UID:vtk-ev1-0@', $ics);
        $this->assertStringContainsString('SUMMARY:Loopweek: Dag 2', $ics);
        $this->assertStringContainsString('DTSTART:20261202T180000Z', $ics);

        $state = $this->asVtk($browser, 'POST', '/api/study_planner/operations', ['op' => 'removeVtkEvent', 'vtkEventId' => 'ev1']);
        $this->assertSame(['week'], array_column($state['vtkEvents'], 'id'));
    }
}
