<?php

namespace App\Tests\Controller\Admin;

use App\Entity\CollabDocument;
use App\Entity\CollabDocumentRevision;
use App\Entity\Exam;
use App\Entity\User;
use App\Factory\ExamFactory;
use App\Factory\UserFactory;
use App\Repository\CollabDocumentRevisionRepository;
use App\Service\Collab\CollabRequestSignature;
use App\Service\Collab\CollabServerClient;
use DateTimeImmutable;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
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

    public function testRestoringGoesThroughTheCollabServerAndKeepsTheCurrentVersion(): void
    {
        $this->loginAs(User::ROLE_MODERATOR);
        $exam = $this->examWithHistory();
        $revisions = static::getContainer()->get(CollabDocumentRevisionRepository::class);
        $oldRevision = $revisions->findOneBy([]);

        $this->client->request(
            'POST',
            sprintf('https://localhost/admin/exam/history/restore?entityId=%d&revisionId=%d', $exam->getId(), $oldRevision?->getId())
        );
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
        $revision = static::getContainer()->get(CollabDocumentRevisionRepository::class)->findOneBy([]);
        $this->collabStatus = 503;

        $this->client->request(
            'POST',
            sprintf('https://localhost/admin/exam/history/restore?entityId=%d&revisionId=%d', $exam->getId(), $revision?->getId())
        );
        $crawler = $this->client->followRedirect();

        self::assertStringContainsString('Nothing was restored', $crawler->filter('.alert-danger')->text());
    }

    public function testLockingAndReopening(): void
    {
        $this->loginAs(User::ROLE_MODERATOR);
        $exam = ExamFactory::createOne(['editableUntil' => new DateTimeImmutable('+5 days')]);
        $id = $exam->getId();

        $this->client->request('POST', 'https://localhost/admin/exam/access/lock?entityId=' . $id);
        self::assertResponseRedirects();
        $this->entityManager()->clear();
        self::assertFalse($this->entityManager()->find(Exam::class, $id)?->isEditable());

        $this->client->request('POST', 'https://localhost/admin/exam/access/reopen?entityId=' . $id);
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
}
