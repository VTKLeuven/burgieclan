<?php

namespace App\Tests\Api;

use App\Constants\Feature;
use App\Entity\ExchangeDestination;
use App\Entity\ExchangeProgramSuggestion;
use App\Entity\ExchangeReport;
use App\Entity\User;
use App\Factory\UserFactory;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Console\Application;
use Symfony\Component\Console\Tester\CommandTester;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Zenstruck\Browser\HttpOptions;
use Zenstruck\Browser\KernelBrowser;

/**
 * Exchange destinations and reports: a report waits for a moderator before others see it, a
 * student can add a destination that is missing, and names and e-mail addresses only show when
 * the author allows it.
 */
class ExchangeTest extends ApiTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        self::enableFeature(Feature::EXCHANGE);
    }

    private function entityManager(): EntityManagerInterface
    {
        return self::getContainer()->get(EntityManagerInterface::class);
    }

    private function destination(string $name = 'ETH Zürich', string $country = 'CH', bool $approved = true): ExchangeDestination
    {
        $destination = (new ExchangeDestination())
            ->setName($name)
            ->setCity('Zürich')
            ->setCountry($country)
            ->setPrograms(['CW', 'BMT'])
            ->setApproved($approved);
        $this->entityManager()->persist($destination);
        $this->entityManager()->flush();

        return $destination;
    }

    private function report(ExchangeDestination $destination, User $author, bool $underReview = false): ExchangeReport
    {
        $report = (new ExchangeReport($destination, $author))
            ->setAcademicYear('2024 - 2025')
            ->setPhase('M1')
            ->setPeriod('S1')
            ->setProgram('CW')
            ->setSections(['housing' => 'Begin op tijd.', 'life' => 'Fijne stad.'])
            ->setUnderReview($underReview);
        $this->entityManager()->persist($report);
        $this->entityManager()->flush();

        return $report;
    }

    /**
     * @param array<string, mixed> $body
     */
    private function post(array $body, ?string $token = null): KernelBrowser
    {
        return $this->browser()->post(
            '/api/exchange/reports',
            HttpOptions::json($body)->withHeader('Authorization', 'Bearer ' . ($token ?? $this->token))
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function validReport(): array
    {
        return [
            'academicYear' => '2024 - 2025',
            'phase' => 'M1',
            'period' => 'S2',
            'program' => 'AI',
            'sections' => ['housing' => 'Via WOKO gevonden.', 'education' => ''],
            'courses' => [['name' => 'Machine Learning', 'code' => '252-0535-00L', 'equivalent' => 'Machine Learning and Inductive Inference', 'text' => 'Zwaar maar goed.']],
            'contactable' => true,
            'showName' => false,
        ];
    }

    private function auth(?string $token = null): array
    {
        return ['headers' => ['Authorization' => 'Bearer ' . ($token ?? $this->token)]];
    }

    public function testTheRoutesAreNotFoundWhileTheFeatureIsOff(): void
    {
        $this->entityManager()->getConnection()->executeStatement('DELETE FROM feature_flag');

        $this->browser()->get('/api/exchange', $this->auth())->assertStatus(404);
    }

    public function testTheOverviewCountsOnlyApprovedReports(): void
    {
        $eth = $this->destination();
        $author = UserFactory::createOne();
        $this->report($eth, $author);
        $this->report($eth, $author, underReview: true);
        $this->destination('Somewhere Unapproved', 'US', approved: false);

        $data = $this->browser()->get('/api/exchange', $this->auth())->assertStatus(200)->json()->decoded();

        $this->assertSame(['ETH Zürich'], array_column($data['destinations'], 'name'));
        $this->assertSame(1, $data['destinations'][0]['reportCount']);
        $this->assertSame('semp', $data['destinations'][0]['scheme']);
        $this->assertSame('housing', $data['recent'][0]['topic']);
    }

    public function testASharedReportWaitsForAModerator(): void
    {
        $eth = $this->destination();

        $created = $this->post(['destinationId' => $eth->getId()] + $this->validReport())->assertStatus(201)->json()->decoded();

        // The author sees it, marked as under review.
        $mine = $this->browser()->get('/api/exchange/destinations/' . $eth->getId(), $this->auth())->json()->decoded();
        $this->assertCount(1, $mine['reports']);
        $this->assertTrue($mine['reports'][0]['underReview']);
        $this->assertTrue($mine['reports'][0]['mine']);
        $this->assertSame(['housing' => 'Via WOKO gevonden.'], $mine['reports'][0]['sections']);

        // Someone else does not, until it is approved.
        $other = $this->getToken(UserFactory::createOne(['plainPassword' => 'password'])->getUsername(), 'password');
        $before = $this->browser()->get('/api/exchange/destinations/' . $eth->getId(), $this->auth($other))->json()->decoded();
        $this->assertSame([], $before['reports']);

        $report = $this->entityManager()->find(ExchangeReport::class, $created['id']);
        $report->setUnderReview(false);
        $this->entityManager()->flush();

        $after = $this->browser()->get('/api/exchange/destinations/' . $eth->getId(), $this->auth($other))->json()->decoded();
        $this->assertCount(1, $after['reports']);
        $this->assertFalse($after['reports'][0]['mine']);
        $this->assertNull($after['reports'][0]['author']);
        $this->assertNotNull($after['reports'][0]['contactEmail']);
        $this->assertSame('Machine Learning', $after['reports'][0]['courses'][0]['name']);
    }

    public function testAStudentCanAddAMissingDestination(): void
    {
        $created = $this->post(['newDestination' => ['name' => 'Università di Bologna', 'city' => 'Bologna', 'country' => 'it']] + $this->validReport())
            ->assertStatus(201)
            ->json()
            ->decoded();

        $destination = $this->entityManager()->find(ExchangeDestination::class, $created['destinationId']);
        $this->assertFalse($destination->isApproved());
        $this->assertSame('IT', $destination->getCountry());

        // Listed for whoever added it, not for anyone else.
        $names = array_column($this->browser()->get('/api/exchange', $this->auth())->json()->decoded()['destinations'], 'name');
        $this->assertContains('Università di Bologna', $names);

        $other = $this->getToken(UserFactory::createOne(['plainPassword' => 'password'])->getUsername(), 'password');
        $names = array_column($this->browser()->get('/api/exchange', $this->auth($other))->json()->decoded()['destinations'], 'name');
        $this->assertNotContains('Università di Bologna', $names);
        $this->browser()->get('/api/exchange/destinations/' . $destination->getId(), $this->auth($other))->assertStatus(404);
    }

    public function testAddingAnExistingNameReusesThatDestination(): void
    {
        $eth = $this->destination();

        $created = $this->post(['newDestination' => ['name' => 'eth zürich', 'city' => 'Zürich', 'country' => 'CH']] + $this->validReport())
            ->assertStatus(201)
            ->json()
            ->decoded();

        $this->assertSame($eth->getId(), $created['destinationId']);
    }

    public function testInvalidReportsAreRefused(): void
    {
        $eth = $this->destination();
        $base = ['destinationId' => $eth->getId()] + $this->validReport();

        $this->post(['phase' => 'B3'] + $base)->assertStatus(422);
        $this->post(['academicYear' => '2024 - 2026'] + $base)->assertStatus(422);
        $this->post(['program' => 'XYZ'] + $base)->assertStatus(422);
        $this->post(['sections' => [], 'courses' => []] + $base)->assertStatus(422);
        $this->post(['courses' => [['name' => '', 'code' => 'X1', 'equivalent' => '', 'text' => '']]] + $base)->assertStatus(422);
        $this->post(['destinationId' => 999999] + $base)->assertStatus(422);
    }

    /**
     * A report sent as multipart, with the JSON in "report" and the files as "files[]".
     *
     * @param array<string, mixed> $report
     * @param list<UploadedFile>   $files
     */
    private function postWithFiles(array $report, array $files, ?string $token = null): KernelBrowser
    {
        return $this->browser()->post(
            '/api/exchange/reports',
            [
            'headers' => ['Authorization' => 'Bearer ' . ($token ?? $this->token)],
            'body' => ['report' => json_encode($report)],
            'files' => ['files' => $files],
            ]
        );
    }

    private function upload(string $name, string $contents): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'exchange');
        file_put_contents($path, $contents);

        return new UploadedFile($path, $name, null, null, true);
    }

    private function pdf(string $name = 'Vakkenpakket ETH.pdf'): UploadedFile
    {
        return $this->upload($name, "%PDF-1.7\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF");
    }

    private function storedFile(string $fileName): string
    {
        return self::getContainer()->getParameter('kernel.project_dir') . '/var/test-exchange-files/' . $fileName;
    }

    public function testAFileAloneIsEnoughForAReport(): void
    {
        $eth = $this->destination();
        $report = ['destinationId' => $eth->getId(), 'sections' => [], 'courses' => []] + $this->validReport();

        $created = $this->postWithFiles($report, [$this->pdf()])->assertStatus(201)->json()->decoded();

        $data = $this->browser()->get('/api/exchange/destinations/' . $eth->getId(), $this->auth())->json()->decoded();
        $files = $data['reports'][0]['files'];
        $this->assertCount(1, $files);
        $this->assertSame('Vakkenpakket ETH.pdf', $files[0]['name']);
        $this->assertSame('pdf', $files[0]['extension']);

        $url = $this->browser()
            ->get(sprintf('/api/exchange/reports/%d/files/%d', $created['id'], $files[0]['id']), $this->auth())
            ->assertStatus(200)
            ->json()
            ->decoded()['url'];

        // The signed link works without a token, and serves the file under its own name.
        $this->browser()
            ->get($url)
            ->assertStatus(200)
            ->assertHeaderContains('Content-Type', 'application/pdf')
            ->assertHeaderContains('Content-Disposition', 'inline');
        $this->browser()->get($url . 'x')->assertStatus(403);
    }

    public function testOthersOnlyReachTheFileOnceTheReportIsApproved(): void
    {
        $eth = $this->destination();
        $created = $this->postWithFiles(['destinationId' => $eth->getId()] + $this->validReport(), [$this->pdf()])->assertStatus(201)->json()->decoded();
        $report = $this->entityManager()->find(ExchangeReport::class, $created['id']);
        $file = $report->getFiles()->first();
        $url = sprintf('/api/exchange/reports/%d/files/%d', $report->getId(), $file->getId());

        $other = $this->getToken(UserFactory::createOne(['plainPassword' => 'password'])->getUsername(), 'password');
        $this->browser()->get($url, $this->auth($other))->assertStatus(404);

        // Each request boots a fresh container, so look the report up again in the current one.
        $this->entityManager()->find(ExchangeReport::class, $created['id'])->setUnderReview(false);
        $this->entityManager()->flush();
        $this->browser()->get($url, $this->auth($other))->assertStatus(200);
    }

    public function testFilesThatAreNotDocumentsAreRefused(): void
    {
        $eth = $this->destination();
        $report = ['destinationId' => $eth->getId()] + $this->validReport();

        // A script renamed to .pdf is still a script.
        $this->postWithFiles($report, [$this->upload('vakken.pdf', "#!/bin/sh\necho hi\n")])
            ->assertStatus(422)
            ->assertJsonMatches('reason', 'type');
        $this->postWithFiles($report, [$this->upload('vakken.exe', 'MZ')])->assertStatus(422)->assertJsonMatches('reason', 'type');
        $this->postWithFiles($report, array_map(fn (int $i): UploadedFile => $this->pdf("deel $i.pdf"), range(1, 6)))
            ->assertStatus(422)
            ->assertJsonMatches('reason', 'count');

        $this->assertSame(0, $this->entityManager()->getRepository(ExchangeReport::class)->count([]));
    }

    public function testDeletingAReportDeletesItsFiles(): void
    {
        $eth = $this->destination();
        $created = $this->postWithFiles(['destinationId' => $eth->getId()] + $this->validReport(), [$this->pdf()])->assertStatus(201)->json()->decoded();
        $fileName = $this->entityManager()->find(ExchangeReport::class, $created['id'])->getFiles()->first()->getFileName();
        $this->assertFileExists($this->storedFile($fileName));

        $this->browser()->delete('/api/exchange/reports/' . $created['id'], $this->auth())->assertStatus(204);

        $this->assertFileDoesNotExist($this->storedFile($fileName));
    }

    public function testHelpfulCountsPerPart(): void
    {
        $eth = $this->destination();
        $report = $this->report($eth, UserFactory::createOne());
        $url = '/api/exchange/reports/' . $report->getId() . '/helpful';

        $this->browser()->put($url, HttpOptions::json(['part' => 'housing', 'helpful' => true])->withHeader('Authorization', 'Bearer ' . $this->token))->assertStatus(204);
        // Twice is still once.
        $this->browser()->put($url, HttpOptions::json(['part' => 'housing', 'helpful' => true])->withHeader('Authorization', 'Bearer ' . $this->token))->assertStatus(204);
        // A topic the report does not have is refused.
        $this->browser()->put($url, HttpOptions::json(['part' => 'transport', 'helpful' => true])->withHeader('Authorization', 'Bearer ' . $this->token))->assertStatus(400);

        $data = $this->browser()->get('/api/exchange/destinations/' . $eth->getId(), $this->auth())->json()->decoded();
        $this->assertSame(['housing' => 1], $data['reports'][0]['helpful']);
        $this->assertSame(['housing'], $data['reports'][0]['myHelpful']);

        $this->browser()->put($url, HttpOptions::json(['part' => 'housing', 'helpful' => false])->withHeader('Authorization', 'Bearer ' . $this->token))->assertStatus(204);
        $data = $this->browser()->get('/api/exchange/destinations/' . $eth->getId(), $this->auth())->json()->decoded();
        $this->assertSame([], $data['reports'][0]['helpful']);
    }

    public function testOnlyTheAuthorDeletesAReport(): void
    {
        $eth = $this->destination();
        $author = UserFactory::createOne(['plainPassword' => 'password']);
        $report = $this->report($eth, $author);

        $this->browser()->delete('/api/exchange/reports/' . $report->getId(), $this->auth())->assertStatus(403);

        $authorToken = $this->getToken($author->getUsername(), 'password');
        $this->browser()->delete('/api/exchange/reports/' . $report->getId(), $this->auth($authorToken))->assertStatus(204);
    }

    public function testAStudentAddedDestinationIsOpenToTheirProgramme(): void
    {
        $created = $this->post(['newDestination' => ['name' => 'Università di Padova', 'city' => 'Padua', 'country' => 'IT']] + $this->validReport())
            ->assertStatus(201)->json()->decoded();

        $destination = $this->entityManager()->find(ExchangeDestination::class, $created['destinationId']);
        $this->assertSame(['AI'], $destination->getPrograms());
        $this->assertSame(ExchangeDestination::SOURCE_STUDENT, $destination->getSource());
    }

    public function testProgrammeSuggestionsWaitForAModeratorAndThenApply(): void
    {
        $eth = $this->destination();
        $url = '/api/exchange/destinations/' . $eth->getId() . '/program_suggestions';
        $auth = fn (array $body) => HttpOptions::json($body)->withHeader('Authorization', 'Bearer ' . $this->token);

        // Adding what is listed and removing what is not change nothing.
        $this->browser()->post($url, $auth(['add' => ['CW'], 'remove' => ['WTK']]))->assertStatus(422);
        $this->browser()->post($url, $auth(['add' => ['NOPE']]))->assertStatus(422);

        $this->browser()->post($url, $auth(['add' => ['WIT'], 'remove' => ['BMT'], 'note' => 'Niet meer in de lijst van 2026.']))->assertStatus(201);

        $data = $this->browser()->get('/api/exchange/destinations/' . $eth->getId(), $this->auth())->json()->decoded();
        $this->assertEqualsCanonicalizing(
            [['program' => 'WIT', 'action' => 'add'], ['program' => 'BMT', 'action' => 'remove']],
            $data['pendingSuggestions']
        );
        $this->assertSame(['BMT', 'CW'], $data['destination']['programs']);

        foreach ($this->entityManager()->getRepository(ExchangeProgramSuggestion::class)->findAll() as $suggestion) {
            $suggestion->accept();
        }
        $this->entityManager()->flush();

        $this->assertSame(['CW', 'WIT'], $this->entityManager()->find(ExchangeDestination::class, $eth->getId())->getPrograms());
    }

    public function testRemovingAProgrammeFromAnOpenDestinationListsTheOthers(): void
    {
        $destination = $this->destination('Tsinghua University', 'CN')->setPrograms([])->setAllPrograms(true);
        $suggestion = new ExchangeProgramSuggestion($destination, null, 'ARCH', ExchangeProgramSuggestion::ACTION_REMOVE);

        $suggestion->accept();

        $this->assertFalse($destination->isAllPrograms());
        $this->assertNotContains('ARCH', $destination->getPrograms());
        $this->assertContains('WTK', $destination->getPrograms());
    }

    public function testTheWikiImportKeepsNamesAndRunsOnlyOnce(): void
    {
        $eth = $this->destination();
        $file = tempnam(sys_get_temp_dir(), 'wiki');
        file_put_contents(
            $file,
            json_encode(
                ['reports' => [
                ['destination' => 'eth zürich', 'academicYear' => '2024 - 2025', 'phase' => 'M1', 'period' => 'S1', 'program' => 'WIT', 'name' => 'Student Een', 'email' => 'een@student.kuleuven.be', 'sections' => ['housing' => 'Via WOKO.'], 'courses' => [['name' => 'Numerics', 'code' => '401', 'equivalent' => 'Numeriek', 'text' => 'Goed.']]],
                ['destination' => 'ETH Zürich', 'academicYear' => '2020 - 2021', 'program' => 'CW', 'name' => 'Student Twee', 'email' => 'twee@student.kuleuven.be'],
                ['destination' => 'Nowhere University'],
                ]]
            )
        );

        $application = new Application(self::$kernel);
        $tester = new CommandTester($application->find('app:exchange:import-wiki'));
        $tester->execute(['file' => $file]);
        $this->assertStringContainsString('Imported 2 report(s)', $tester->getDisplay());
        $this->assertStringContainsString('Nowhere University', $tester->getDisplay());

        $tester->execute(['file' => $file]);
        $this->assertStringContainsString('Imported 0 report(s), skipped 2', $tester->getDisplay());
        unlink($file);

        $data = $this->browser()->get('/api/exchange/destinations/' . $eth->getId(), $this->auth())->json()->decoded();
        $this->assertCount(2, $data['reports']);
        $this->assertSame('Student Een', $data['reports'][0]['author']);
        $this->assertSame('een@student.kuleuven.be', $data['reports'][0]['contactEmail']);
        $this->assertFalse($data['reports'][0]['mine']);
    }
}
