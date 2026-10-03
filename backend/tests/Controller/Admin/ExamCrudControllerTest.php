<?php

namespace App\Tests\Controller\Admin;

use App\Entity\CollabDocument;
use App\Entity\CollabDocumentRevision;
use App\Entity\Exam;
use App\Entity\ExamQuestion;
use App\Entity\ExamQuestionComment;
use App\Entity\User;
use App\Factory\ExamFactory;
use App\Factory\UserFactory;
use App\Repository\CollabDocumentRevisionRepository;
use App\Service\Collab\CollabRequestSignature;
use App\Service\Collab\CollabServerClient;
use DateTimeImmutable;
use Doctrine\Bundle\DoctrineBundle\DataCollector\DoctrineDataCollector;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\DomCrawler\Crawler;
use Symfony\Component\HttpClient\MockHttpClient;
use Symfony\Component\HttpClient\Response\MockResponse;
use Zenstruck\Foundry\Test\ResetDatabase;

/**
 * Moderators roll back, lock and reopen reconstructions here. Each of those also has to reach
 * the collab server, which is replaced by a MockHttpClient that records what it was asked.
 */
class ExamCrudControllerTest extends WebTestCase
{
    use ResetDatabase;

    private KernelBrowser $client;

    /** @var list<array{method: string, url: string, headers: array<string>, body: string}> */
    private array $collabRequests = [];

    private int $collabStatus = 204;

    protected function setUp(): void
    {
        $this->client = static::createClient();
        // Keep the mocked collab server for every request of a test.
        $this->client->disableReboot();

        $mock = new MockHttpClient(
            function (string $method, string $url, array $options): MockResponse {
                $this->collabRequests[] = [
                'method' => $method,
                'url' => $url,
                'headers' => $options['headers'] ?? [],
                'body' => (string) ($options['body'] ?? ''),
                ];

                return new MockResponse('', ['http_code' => $this->collabStatus]);
            }
        );

        $signature = static::getContainer()->get(CollabRequestSignature::class);
        static::getContainer()->set(
            CollabServerClient::class,
            new CollabServerClient($mock, $signature, 'http://collab.test')
        );
    }

    private function loginAs(string $role): User
    {
        $user = UserFactory::createOne(['roles' => [$role], 'fullName' => 'Mona Moderator']);
        $this->client->loginUser($user);

        return $user;
    }

    private function entityManager(): EntityManagerInterface
    {
        return static::getContainer()->get(EntityManagerInterface::class);
    }

    private function detailPage(Exam|int $exam): Crawler
    {
        $id = $exam instanceof Exam ? $exam->getId() : $exam;
        $crawler = $this->client->request('GET', 'https://localhost/admin/exam/' . $id);
        self::assertResponseIsSuccessful();

        return $crawler;
    }

    /**
     * Presses a button on the detail page the way a moderator would, CSRF token included.
     */
    private function press(Exam|int $exam, string $button): void
    {
        $this->client->submit($this->detailPage($exam)->selectButton($button)->form());
    }

    private function examWithHistory(): Exam
    {
        $exam = ExamFactory::createOne();
        $editor = UserFactory::createOne(['fullName' => 'Eddie Editor', 'username' => 'r0123456']);

        $document = new CollabDocument($exam->getDocumentName(), 'old state');
        $document->setContent(
            ['type' => 'doc', 'content' => [
            ['type' => 'examQuestion', 'content' => [
                ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'Bewijs <b>de stelling</b>.']]],
            ]],
            ]]
        );
        $document->setFields(['sittings' => [['id' => 'd1', 'label' => 'ma 20 jan']]]);
        $document->addPendingContributors([(int) $editor->getId()]);
        $this->entityManager()->persist($document);
        $this->entityManager()->persist(
            new CollabDocumentRevision($document, $document->takePendingContributors())
        );

        $document->setState('vandalised state');
        $document->setContent(['type' => 'doc', 'content' => []]);
        $this->entityManager()->flush();

        return $exam;
    }

    public function testRegularUsersHaveNoAccess(): void
    {
        $this->loginAs(User::ROLE_USER);
        $exam = ExamFactory::createOne();

        $this->client->request('GET', 'https://localhost/admin/exam/' . $exam->getId());
        self::assertResponseStatusCodeSame(403);
    }

    public function testTheDetailPageShowsTheHistoryWithRealNames(): void
    {
        $this->loginAs(User::ROLE_MODERATOR);
        $exam = $this->examWithHistory();

        $crawler = $this->client->request('GET', 'https://localhost/admin/exam/' . $exam->getId());
        self::assertResponseIsSuccessful();

        $history = $crawler->filter('details')->first();
        self::assertStringContainsString('Eddie Editor (r0123456)', $history->text());
        self::assertStringContainsString('ma 20 jan', $history->text());
        // Student-written text is printed, never interpreted.
        self::assertStringContainsString('Bewijs <b>de stelling</b>.', $history->filter('li')->text());
        self::assertCount(0, $history->filter('li b'));
    }

    public function testTheHistoryLooksUpEveryoneInOneQuery(): void
    {
        $this->loginAs(User::ROLE_MODERATOR);
        $exam = ExamFactory::createOne();
        $document = new CollabDocument($exam->getDocumentName(), 'state');
        $this->entityManager()->persist($document);
        foreach (range(1, 5) as $i) {
            $editor = UserFactory::createOne(['fullName' => 'Editor ' . $i]);
            $this->entityManager()->persist(new CollabDocumentRevision($document, [(int) $editor->getId()]));
        }
        $this->entityManager()->flush();

        $this->client->enableProfiler();
        $crawler = $this->detailPage($exam);

        foreach (range(1, 5) as $i) {
            self::assertStringContainsString('Editor ' . $i, $crawler->filter('section')->text());
        }
        // Lookups of several users at once; the logged-in moderator and "Started by" are one each.
        $collector = $this->client->getProfile()->getCollector('db');
        self::assertInstanceOf(DoctrineDataCollector::class, $collector);
        $lookups = array_filter(
            $collector->getQueries()['default'],
            static fn(array $query): bool => str_contains($query['sql'], 'FROM burgieclan_user')
                && str_contains($query['sql'], ' IN (')
        );
        self::assertCount(1, $lookups);
    }

    public function testRestoringGoesThroughTheCollabServerAndKeepsTheCurrentVersion(): void
    {
        $this->loginAs(User::ROLE_MODERATOR);
        $exam = $this->examWithHistory();
        $revisions = static::getContainer()->get(CollabDocumentRevisionRepository::class);
        $oldRevision = $revisions->findOneBy([]);

        $this->press($exam, 'Restore this version');
        self::assertResponseRedirects();

        self::assertCount(1, $this->collabRequests);
        $request = $this->collabRequests[0];
        self::assertSame('POST', $request['method']);
        self::assertSame('http://collab.test/internal/documents/' . $exam->getDocumentName() . '/restore', $request['url']);
        self::assertSame(['state' => base64_encode('old state')], json_decode($request['body'], true));
        self::assertTrue(
            (bool) array_filter($request['headers'], static fn(string $header): bool => str_starts_with($header, 'X-Collab-Signature: sha256='))
        );

        // The vandalised version was kept first, so the rollback can be undone.
        $latest = $revisions->findLatest($oldRevision->getDocument());
        self::assertSame('vandalised state', $latest?->getState());
        self::assertStringContainsString('Before Mona Moderator restored', (string) $latest->getNote());
    }

    public function testRestoringIsPostOnly(): void
    {
        $this->loginAs(User::ROLE_MODERATOR);
        $exam = $this->examWithHistory();

        $this->client->request('GET', 'https://localhost/admin/exam/history/restore?entityId=' . $exam->getId() . '&revisionId=1');
        self::assertResponseStatusCodeSame(405);
        self::assertCount(0, $this->collabRequests);
    }

    public function testAFailedRestoreSaysSo(): void
    {
        $this->loginAs(User::ROLE_MODERATOR);
        $exam = $this->examWithHistory();
        $this->collabStatus = 503;

        $this->press($exam, 'Restore this version');
        $crawler = $this->client->followRedirect();

        self::assertStringContainsString('Nothing was restored', $crawler->filter('.alert-danger')->text());
    }

    public function testLockingAndReopening(): void
    {
        $this->loginAs(User::ROLE_MODERATOR);
        $exam = ExamFactory::createOne(['editableUntil' => new DateTimeImmutable('+5 days')]);
        $id = $exam->getId();

        $this->press($id, 'Lock now');
        self::assertResponseRedirects();
        $this->entityManager()->clear();
        self::assertFalse($this->entityManager()->find(Exam::class, $id)?->isEditable());

        $this->press($id, 'Reopen for two weeks');
        $this->entityManager()->clear();
        $reopened = $this->entityManager()->find(Exam::class, $id);
        self::assertTrue($reopened?->isEditable());
        self::assertGreaterThan(new DateTimeImmutable('+13 days'), $reopened->getEditableUntil());

        // Both times everyone who had it open was reconnected, to pick up the new access.
        self::assertSame(
            array_fill(0, 2, 'http://collab.test/internal/documents/exam-' . $id . '/disconnect'),
            array_column($this->collabRequests, 'url')
        );
    }

    /**
     * Another site, or another *.vtk.be subdomain, can make a moderator's browser post here, but
     * it cannot read the token off the page.
     */
    public function testActionsWithoutAValidTokenChangeNothing(): void
    {
        $this->loginAs(User::ROLE_MODERATOR);
        $exam = $this->examWithHistory();
        $id = $exam->getId();
        $revisions = static::getContainer()->get(CollabDocumentRevisionRepository::class);
        $revision = $revisions->findOneBy([]);

        $this->client->request('POST', 'https://localhost/admin/exam/access/lock?entityId=' . $id);
        self::assertResponseRedirects();
        $this->client->request(
            'POST',
            sprintf('https://localhost/admin/exam/history/restore?entityId=%d&revisionId=%d', $id, $revision?->getId()),
            ['_token' => 'forged']
        );
        $crawler = $this->client->followRedirect();

        self::assertStringContainsString('Invalid CSRF token', $crawler->filter('.alert-danger')->text());
        $this->entityManager()->clear();
        self::assertTrue($this->entityManager()->find(Exam::class, $id)?->isEditable());
        self::assertCount(1, $revisions->findAll());
        self::assertSame([], $this->collabRequests);
    }

    public function testDeletingDropsEveryoneWhoHasItOpen(): void
    {
        $this->loginAs(User::ROLE_ADMIN);
        $exam = $this->examWithHistory();
        $id = $exam->getId();

        $token = $this->detailPage($exam)->filter('input[name="token"]')->attr('value');
        $this->client->request('POST', sprintf('https://localhost/admin/exam/%d/delete', $id), ['token' => $token]);
        self::assertResponseRedirects();

        $this->entityManager()->clear();
        self::assertNull($this->entityManager()->find(Exam::class, $id));
        self::assertSame(
            ['http://collab.test/internal/documents/exam-' . $id . '/disconnect'],
            array_column($this->collabRequests, 'url')
        );
    }

    public function testModeratorsSeeCommentsWithTheirAuthorsAndDeleteThem(): void
    {
        $this->loginAs(User::ROLE_MODERATOR);
        $exam = ExamFactory::createOne();
        $author = UserFactory::createOne(['fullName' => 'Anna Auteur', 'username' => 'r0654321']);
        $question = new ExamQuestion($exam, 'q1');
        $question->setText('Bewijs de stelling.');
        $comment = new ExamQuestionComment($author, $question);
        $comment->setContent('Zie <b>slide 12</b>.')->setAnonymous(true);
        $this->entityManager()->persist($question);
        $this->entityManager()->persist($comment);
        $this->entityManager()->flush();
        $commentId = $comment->getId();

        $crawler = $this->detailPage($exam);
        $section = $crawler->filter('section')->reduce(
            static fn(Crawler $node): bool => str_contains($node->filter('h2')->text(''), 'Comments')
        );
        self::assertStringContainsString('Bewijs de stelling.', $section->text());
        // Moderators see who wrote an anonymous comment; the text is printed, never interpreted.
        self::assertStringContainsString('Anna Auteur (r0654321)', $section->text());
        self::assertStringContainsString('Shown anonymously', $section->text());
        self::assertStringContainsString('Zie <b>slide 12</b>.', $section->text());
        self::assertCount(0, $section->filter('p b'));

        $this->client->submit($section->filter('form')->form());
        self::assertResponseRedirects();

        $this->entityManager()->clear();
        self::assertNull($this->entityManager()->find(ExamQuestionComment::class, $commentId));
        self::assertSame(
            ['http://collab.test/internal/documents/exam-' . $exam->getId() . '/broadcast'],
            array_column($this->collabRequests, 'url')
        );
    }
}
