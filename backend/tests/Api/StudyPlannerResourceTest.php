<?php

namespace App\Tests\Api;

use App\Factory\CourseFactory;
use App\Factory\UserFactory;
use App\Service\StudyPlanner\IcsParser;
use App\Service\StudyPlanner\StudyPlannerSync;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\NullLogger;
use Symfony\Component\HttpClient\MockHttpClient;
use Symfony\Component\HttpClient\Response\MockResponse;
use Zenstruck\Browser\KernelBrowser;

/**
 * The study planner through the API the planner page uses, with KU Leuven's timetable replaced
 * by a canned feed.
 */
class StudyPlannerResourceTest extends ApiTestCase
{
    private const LINK = 'webcal://cloud.timeedit.net/be_kuleuven/web/public/s.ics?sid=7&type=student&value=abc';

    /** The feed the mock TimeEdit serves; tests change it between syncs. */
    private string $feed = '';

    private int $feedStatus = 200;

    /** @var list<string> */
    private array $fetched = [];

    /**
     * One kernel for every request of a test, with TimeEdit replaced by $this->feed. Log
     * everyone in first: getToken() starts a fresh kernel, which would drop the mock.
     */
    private function browserWithFeed(): KernelBrowser
    {
        $browser = $this->browser();
        $browser->client()->disableReboot();

        $mock = new MockHttpClient(
            function (string $method, string $url): MockResponse {
                $this->fetched[] = $url;

                return new MockResponse($this->feed, ['http_code' => $this->feedStatus]);
            }
        );
        $sync = new StudyPlannerSync(
            $mock,
            new IcsParser(),
            self::getContainer()->get(EntityManagerInterface::class),
            new NullLogger(),
        );
        self::getContainer()->set(StudyPlannerSync::class, $sync);

        return $browser;
    }

    /**
     * @param list<array{uid: string, start: string, end: string, summary: string, location?: string, kind?: string}> $events
     */
    private static function ics(array $events): string
    {
        $lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TimeEdit//EN'];
        foreach ($events as $e) {
            $lines[] = 'BEGIN:VEVENT';
            $lines[] = 'UID:' . $e['uid'];
            $lines[] = 'DTSTART:' . $e['start'];
            $lines[] = 'DTEND:' . $e['end'];
            $lines[] = 'SUMMARY:' . str_replace(',', '\\,', $e['summary']);
            $lines[] = 'LOCATION:' . ($e['location'] ?? 'aula C ELEC.91.B300');
            $lines[] = 'DESCRIPTION:' . ($e['kind'] ?? '01 College') . '\\nmore text';
            $lines[] = 'END:VEVENT';
        }
        $lines[] = 'END:VCALENDAR';

        return implode("\r\n", $lines) . "\r\n";
    }

    /** Three lectures and two parallel practical groups, in UTC as TimeEdit sends them. */
    private function defaultFeed(): string
    {
        return self::ics(
            [
            ['uid' => 'l1@timeedit.com', 'start' => '20260921T083500Z', 'end' => '20260921T103000Z', 'summary' => 'H04A9a Power System Calculations: Lecture, Dirk Van Hertem'],
            ['uid' => 'l2@timeedit.com', 'start' => '20260928T083500Z', 'end' => '20260928T103000Z', 'summary' => 'H04A9a Power System Calculations: Lecture, Dirk Van Hertem'],
            ['uid' => 'l3@timeedit.com', 'start' => '20261005T083500Z', 'end' => '20261005T103000Z', 'summary' => 'H04A9a Power System Calculations: Lecture, Dirk Van Hertem'],
            ['uid' => 'p1@timeedit.com', 'start' => '20260922T120000Z', 'end' => '20260922T140000Z', 'summary' => 'H04B0a Power System Calculations: Exercises and Practica', 'kind' => '02 Practicum', 'location' => 'PC-lokaal 1'],
            ['uid' => 'p2@timeedit.com', 'start' => '20260924T120000Z', 'end' => '20260924T140000Z', 'summary' => 'H04B0a Power System Calculations: Exercises and Practica', 'kind' => '02 Practicum', 'location' => 'PC-lokaal 2'],
            ]
        );
    }

    private function token(): string
    {
        $user = UserFactory::createOne(['plainPassword' => 'password']);

        return $this->getToken($user->getUsername(), 'password');
    }

    /**
     * @param array<string, mixed>|null $json
     *
     * @return array<string, mixed>
     */
    private function call(KernelBrowser $browser, string $token, string $method, string $url, ?array $json = null, int $status = 200): array
    {
        $options = ['headers' => ['Authorization' => 'Bearer ' . $token, 'Content-Type' => 'application/ld+json']];
        if (null !== $json) {
            $options['json'] = $json;
        }
        $browser->request($method, $url, $options)->assertStatus($status);
        $body = $browser->content();

        return '' === $body ? [] : (json_decode($body, true) ?? []);
    }

    /**
     * @param array<string, mixed> $state
     *
     * @return array<string, mixed>
     */
    private static function event(array $state, string $uid): array
    {
        foreach ($state['events'] as $event) {
            if ($event['uid'] === $uid) {
                return $event;
            }
        }
        self::fail('No session ' . $uid);
    }

    public function testNeedsLogin(): void
    {
        $this->browser()->get('/api/study_planner')->assertStatus(401);
    }

    public function testWithoutSubscription(): void
    {
        $token = $this->token();
        $state = $this->call($this->browserWithFeed(), $token, 'GET', '/api/study_planner');

        $this->assertFalse($state['subscribed']);
        $this->assertSame([], $state['events']);
        $this->assertSame([], $this->fetched);
    }

    public function testRejectsOtherLinks(): void
    {
        $token = $this->token();
        $browser = $this->browserWithFeed();
        foreach (['https://example.com/s.ics', 'http://169.254.169.254/latest', 'webcal://cloud.timeedit.net:8080/be_kuleuven/s.ics'] as $link) {
            $this->call($browser, $token, 'POST', '/api/study_planner/subscription', ['icsUrl' => $link], 422);
        }
        $this->assertSame([], $this->fetched);
    }

    public function testSubscribeSyncsAndGroupsSessions(): void
    {
        CourseFactory::createOne(['code' => 'H04A9A', 'name' => 'Berekeningen van elektrische energiesystemen', 'nameEn' => 'Power System Calculations']);
        $token = $this->token();
        $this->feed = $this->defaultFeed();
        $browser = $this->browserWithFeed();

        $state = $this->call($browser, $token, 'POST', '/api/study_planner/subscription', ['icsUrl' => self::LINK]);

        $this->assertSame(['https://cloud.timeedit.net/be_kuleuven/web/public/s.ics?sid=7&type=student&value=abc'], $this->fetched);
        $this->assertTrue($state['subscribed']);
        // Null fields are left out of the response.
        $this->assertArrayNotHasKey('syncError', $state);
        $this->assertCount(5, $state['events']);
        $this->assertMatchesRegularExpression('#^/api/study_planner/feed/[a-f0-9]{48}\.ics$#', $state['feedPath']);

        // 08:35 UTC is 10:35 in Leuven (summer time).
        $lecture = self::event($state, 'l1@timeedit.com');
        $this->assertSame('2026-09-21', $lecture['date']);
        $this->assertSame('10:35', $lecture['start']);
        $this->assertSame('12:30', $lecture['end']);
        $this->assertSame('Power System Calculations: Lecture', $lecture['course']);
        $this->assertSame('college', $lecture['type']);

        // The lecture matches the course by code; the practicals join it by name.
        $this->assertCount(1, $state['subjects']);
        $this->assertSame($lecture['subject'], self::event($state, 'p1@timeedit.com')['subject']);
        $this->assertNotNull($lecture['courseId']);
        $this->assertSame('practicum', self::event($state, 'p1@timeedit.com')['type']);

        // A second GET within the hour does not fetch again.
        $this->call($browser, $token, 'GET', '/api/study_planner');
        $this->assertCount(1, $this->fetched);
    }

    public function testGroupsActivitiesNamedTogetherAcrossLanguages(): void
    {
        $token = $this->token();
        $this->feed = self::ics(
            [
            ['uid' => 'en1@timeedit.com', 'start' => '20260921T083500Z', 'end' => '20260921T103000Z', 'summary' => 'H04B7a Finite Elements for Electromagnetic Fields: Lecture, Ruth Vazquez Sabariego'],
            ['uid' => 'nl1@timeedit.com', 'start' => '20260922T120000Z', 'end' => '20260922T140000Z', 'summary' => 'H00T2a Eindige elementen voor elektromagnetische velden: oefeningen, H04C0a Finite Elements for Electromagnetic Fields: Exercises, Ruth Vazquez Sabariego', 'kind' => '02 Practicum'],
            ['uid' => 'nl2@timeedit.com', 'start' => '20260929T120000Z', 'end' => '20260929T140000Z', 'summary' => 'H00T2a Eindige elementen voor elektromagnetische velden: oefeningen, H04C0a Finite Elements for Electromagnetic Fields: Exercises, Ruth Vazquez Sabariego', 'kind' => '02 Practicum'],
            ['uid' => 'ba@timeedit.com', 'start' => '20260923T083500Z', 'end' => '20260923T103000Z', 'summary' => 'H0T34a Nuclear Energy: Basic Aspects, William Dhaeseleer'],
            ['uid' => 'di@timeedit.com', 'start' => '20260924T083500Z', 'end' => '20260924T103000Z', 'summary' => 'H0H03a Nuclear Energy: Deepening Insights, William Dhaeseleer'],
            ]
        );
        $state = $this->call($this->browserWithFeed(), $token, 'POST', '/api/study_planner/subscription', ['icsUrl' => self::LINK]);

        $labels = array_column($state['subjects'], 'label');
        sort($labels);
        $this->assertSame(
            [
            'Finite Elements for Electromagnetic Fields',
            'Nuclear Energy: Basic Aspects',
            'Nuclear Energy: Deepening Insights',
            ],
            $labels
        );
        $this->assertSame(self::event($state, 'en1@timeedit.com')['subject'], self::event($state, 'nl1@timeedit.com')['subject']);
        // The other activity is not a person.
        $this->assertSame('Ruth Vazquez Sabariego', self::event($state, 'nl1@timeedit.com')['people']);
    }

    public function testSyncKeepsHistoryAndMarksRemovedSessions(): void
    {
        $token = $this->token();
        $this->feed = $this->defaultFeed();
        $browser = $this->browserWithFeed();
        $this->call($browser, $token, 'POST', '/api/study_planner/subscription', ['icsUrl' => self::LINK]);
        $this->call($browser, $token, 'POST', '/api/study_planner/operations', ['op' => 'done', 'uid' => 'l1@timeedit.com', 'value' => true]);

        // The window moved on: l1 fell out of the feed (history), l3 was cancelled (removed).
        $this->feed = self::ics(
            [
            ['uid' => 'l2@timeedit.com', 'start' => '20260928T083500Z', 'end' => '20260928T103000Z', 'summary' => 'H04A9a Power System Calculations: Lecture'],
            ['uid' => 'p2@timeedit.com', 'start' => '20260924T120000Z', 'end' => '20260924T140000Z', 'summary' => 'H04B0a Power System Calculations: Exercises and Practica', 'kind' => '02 Practicum'],
            ]
        );
        $state = $this->call($browser, $token, 'POST', '/api/study_planner/sync');

        $uids = array_column($state['events'], 'uid');
        $this->assertContains('l1@timeedit.com', $uids);
        $this->assertTrue(self::event($state, 'l1@timeedit.com')['done']);
        $this->assertNotContains('l3@timeedit.com', $uids);
        // p1 started before the new window (24 Sep), so it only fell out of the feed.
        $this->assertContains('p1@timeedit.com', $uids);
    }

    public function testFailingFeedKeepsTheTimetable(): void
    {
        $token = $this->token();
        $this->feed = $this->defaultFeed();
        $browser = $this->browserWithFeed();
        $this->call($browser, $token, 'POST', '/api/study_planner/subscription', ['icsUrl' => self::LINK]);

        $this->feedStatus = 404;
        $state = $this->call($browser, $token, 'POST', '/api/study_planner/sync');

        $this->assertNotNull($state['syncError']);
        $this->assertCount(5, $state['events']);
    }

    public function testMarksRulesAndKeepOnly(): void
    {
        $token = $this->token();
        $this->feed = $this->defaultFeed();
        $browser = $this->browserWithFeed();
        $this->call($browser, $token, 'POST', '/api/study_planner/subscription', ['icsUrl' => self::LINK]);

        $state = $this->call($browser, $token, 'POST', '/api/study_planner/operations', ['op' => 'keepOnly', 'uid' => 'p2@timeedit.com']);
        $this->assertSame('event', self::event($state, 'p1@timeedit.com')['hidden']);
        $this->assertNull(self::event($state, 'p2@timeedit.com')['hidden']);

        $state = $this->call($browser, $token, 'POST', '/api/study_planner/operations', ['op' => 'addRule', 'uid' => 'l1@timeedit.com', 'action' => 'mandatory']);
        foreach (['l1@timeedit.com', 'l2@timeedit.com', 'l3@timeedit.com'] as $uid) {
            $this->assertSame('rule', self::event($state, $uid)['mandatory']);
        }
        $rule = self::event($state, 'l2@timeedit.com')['mandatoryRule'];

        $state = $this->call($browser, $token, 'POST', '/api/study_planner/operations', ['op' => 'removeRule', 'id' => $rule]);
        $this->assertNull(self::event($state, 'l2@timeedit.com')['mandatory']);

        $this->call($browser, $token, 'POST', '/api/study_planner/operations', ['op' => 'done', 'uid' => 'nope'], 404);
    }

    public function testDeadlines(): void
    {
        $token = $this->token();
        $this->feed = $this->defaultFeed();
        $browser = $this->browserWithFeed();
        $state = $this->call($browser, $token, 'POST', '/api/study_planner/subscription', ['icsUrl' => self::LINK]);
        $subject = $state['subjects'][0]['key'];
        $item = ['subject' => $subject, 'kind' => 'mandatory', 'title' => 'Lab 3', 'date' => '2026-10-14', 'time' => '13:30', 'end' => '15:30', 'note' => 'Bring a laptop'];

        $state = $this->call($browser, $token, 'POST', '/api/study_planner/operations', ['op' => 'addItem', 'item' => $item]);
        $this->assertCount(1, $state['items']);
        $id = $state['items'][0]['id'];
        $this->assertSame('15:30', $state['items'][0]['end']);

        $state = $this->call($browser, $token, 'POST', '/api/study_planner/operations', ['op' => 'itemDone', 'id' => $id, 'value' => true]);
        $this->assertNotNull($state['items'][0]['done']);

        $this->call($browser, $token, 'POST', '/api/study_planner/operations', ['op' => 'updateItem', 'id' => $id, 'item' => ['end' => '12:00'] + $item], 400);
        $this->call($browser, $token, 'POST', '/api/study_planner/operations', ['op' => 'addItem', 'item' => ['subject' => 'name:Unknown'] + $item], 400);

        $state = $this->call($browser, $token, 'POST', '/api/study_planner/operations', ['op' => 'deleteItem', 'id' => $id]);
        $this->assertSame([], $state['items']);
    }

    public function testExportedCalendar(): void
    {
        $token = $this->token();
        $this->feed = $this->defaultFeed();
        $browser = $this->browserWithFeed();
        $state = $this->call($browser, $token, 'POST', '/api/study_planner/subscription', ['icsUrl' => self::LINK]);
        $this->call($browser, $token, 'POST', '/api/study_planner/operations', ['op' => 'mandatory', 'uid' => 'l2@timeedit.com', 'value' => true]);
        $this->call($browser, $token, 'POST', '/api/study_planner/operations', ['op' => 'hide', 'uid' => 'p1@timeedit.com', 'value' => true]);
        $this->call(
            $browser,
            $token,
            'POST',
            '/api/study_planner/operations',
            ['op' => 'addItem', 'item' => [
            'subject' => $state['subjects'][0]['key'], 'kind' => 'deadline', 'title' => 'Report', 'date' => '2026-10-20', 'time' => null, 'note' => '',
            ]]
        );

        // No login: the token in the link is the key.
        $browser->get($state['feedPath'])
            ->assertStatus(200)
            ->assertHeaderContains('Content-Type', 'text/calendar');
        $ics = $browser->content();
        $unfolded = str_replace("\r\n ", '', $ics);

        $this->assertStringContainsString('SUMMARY:MANDATORY: H04A9a Power System Calculations: Lecture\, Dirk Van Hertem', $unfolded);
        $this->assertSame(5, substr_count($ics, 'BEGIN:VEVENT'), 'five sessions, one hidden, plus the deadline');
        $this->assertStringContainsString('DTSTART;VALUE=DATE:20261020', $ics);
        $this->assertStringContainsString('SUMMARY:Deadline: Report', $unfolded);
        foreach (explode("\r\n", $ics) as $line) {
            $this->assertLessThanOrEqual(75, strlen($line));
        }

        // A new link: the old one stops working.
        $rotated = $this->call($browser, $token, 'POST', '/api/study_planner/feed_token');
        $this->assertNotSame($state['feedPath'], $rotated['feedPath']);
        $browser->get($state['feedPath'])->assertStatus(404);
        $browser->get($rotated['feedPath'])->assertStatus(200);
    }

    public function testUnsubscribe(): void
    {
        $token = $this->token();
        $this->feed = $this->defaultFeed();
        $browser = $this->browserWithFeed();
        $state = $this->call($browser, $token, 'POST', '/api/study_planner/subscription', ['icsUrl' => self::LINK]);

        $this->call($browser, $token, 'DELETE', '/api/study_planner', null, 204);

        $this->assertFalse($this->call($browser, $token, 'GET', '/api/study_planner')['subscribed']);
        $browser->get($state['feedPath'])->assertStatus(404);
    }
}
