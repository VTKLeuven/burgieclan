<?php

namespace App\Tests\Api;

use App\Entity\Exam;
use App\Entity\ExamQuestion;
use App\Entity\User;
use App\Factory\ExamFactory;
use App\Factory\UserFactory;
use App\Repository\ExamQuestionRepository;
use App\Service\Collab\CollabDisplayName;
use App\Service\Collab\CollabDocumentStore;
use App\Service\Collab\CollabRequestSignature;
use App\Service\Collab\CollabServerClient;
use DateTimeImmutable;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpClient\MockHttpClient;
use Symfony\Component\HttpClient\Response\MockResponse;
use Zenstruck\Browser\KernelBrowser;

/**
 * Comments on exam questions and "Ik had deze ook", through the API the exam page uses.
 */
class ExamQuestionCommentResourceTest extends ApiTestCase
{
    /** @var list<array{url: string, body: string}> */
    private array $collabRequests = [];

    private int $collabStatus = 204;

    private function login(bool $anonymous = true, array $roles = [User::ROLE_USER]): string
    {
        $user = UserFactory::createOne(
            [
                'plainPassword' => 'password',
                'defaultAnonymous' => $anonymous,
                'roles' => $roles,
            ]
        );

        return $this->getToken($user->getUsername(), 'password');
    }

    /**
     * An exam whose document holds questions q1 and q2, as the collab server stores it.
     */
    private function exam(array $attributes = []): Exam
    {
        $exam = ExamFactory::createOne($attributes);
        $content = ['type' => 'doc', 'content' => [
            ['type' => 'examQuestion', 'attrs' => ['id' => 'q1', 'sittings' => []], 'content' => [
                ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'Bewijs de stelling.']]],
            ]],
            ['type' => 'examQuestion', 'attrs' => ['id' => 'q2', 'sittings' => []], 'content' => [
                ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'Bereken de limiet.']]],
            ]],
        ]];
        self::getContainer()->get(CollabDocumentStore::class)
            ->store($exam->getDocumentName(), 'state', $content, null, []);

        return $exam;
    }

    /**
     * One kernel for every request of a test, with the collab server replaced by a recorder, so
     * the test can see what was announced (and a rate limit can add up). Log everyone in first:
     * getToken() starts a fresh kernel, which would drop both.
     */
    private function browserWithCollab(): KernelBrowser
    {
        $browser = $this->browser();
        $browser->client()->disableReboot();

        $mock = new MockHttpClient(
            function (string $method, string $url, array $options): MockResponse {
                $this->collabRequests[] = ['url' => $url, 'body' => (string) ($options['body'] ?? '')];

                return new MockResponse('', ['http_code' => $this->collabStatus]);
            }
        );
        $signature = self::getContainer()->get(CollabRequestSignature::class);
        $client = new CollabServerClient($mock, $signature, 'http://collab.test');
        self::getContainer()->set(CollabServerClient::class, $client);

        return $browser;
    }

    /**
     * @param array<string, mixed> $json
     */
    private function post(KernelBrowser $browser, string $token, string $url, array $json): KernelBrowser
    {
        return $browser->post(
            $url,
            [
                'headers' => ['Authorization' => 'Bearer ' . $token, 'Content-Type' => 'application/ld+json'],
                'json' => $json,
            ]
        );
    }

    private function comment(
        KernelBrowser $browser,
        string $token,
        Exam $exam,
        string $uid,
        string $content
    ): KernelBrowser {
        $json = ['exam' => '/api/exams/' . $exam->getId(), 'questionUid' => $uid, 'content' => $content];

        return $this->post($browser, $token, '/api/exam_question_comments', $json);
    }

    private function confirm(
        KernelBrowser $browser,
        string $token,
        Exam $exam,
        string $uid,
        bool $confirmed
    ): KernelBrowser {
        $url = '/api/exams/' . $exam->getId() . '/confirmations';

        return $this->post($browser, $token, $url, ['questionUid' => $uid, 'confirmed' => $confirmed]);
    }

    /**
     * @return array<string, mixed>
     */
    private function get(KernelBrowser $browser, string $token, string $url): array
    {
        return $browser->get($url, ['headers' => ['Authorization' => 'Bearer ' . $token]])
            ->assertStatus(200)
            ->json()
            ->decoded();
    }

    private function threadUrl(Exam $exam, string $uid): string
    {
        return sprintf(
            '/api/exam_question_comments?question.exam=%d&question.uid=%s&pagination=false',
            $exam->getId(),
            $uid
        );
    }

    public function testCommentingAndReadingAThread(): void
    {
        $token = $this->login(anonymous: false);
        $browser = $this->browserWithCollab();
        $exam = $this->exam();

        $this->comment($browser, $token, $exam, 'q1', "  Het antwoord is 42.\n ")
            ->assertStatus(201)
            ->assertJsonMatches('content', 'Het antwoord is 42.')
            ->assertJsonMatches('questionUid', 'q1')
            ->assertJsonMatches('mine', true)
            ->assertJsonMatches('anonymous', false);
        $this->comment($browser, $token, $exam, 'q2', 'Over vraag 2.')->assertStatus(201);

        $thread = $this->get($browser, $token, $this->threadUrl($exam, 'q1'));
        $this->assertSame(['Het antwoord is 42.'], array_column($thread['hydra:member'], 'content'));
        // Nobody's account is ever exposed, only a name.
        $this->assertArrayNotHasKey('creator', $thread['hydra:member'][0]);
        $this->assertArrayNotHasKey('creatorId', $thread['hydra:member'][0]);

        // Everyone who has the exam open is told which question changed.
        $this->assertSame(
            'http://collab.test/internal/documents/exam-' . $exam->getId() . '/broadcast',
            $this->collabRequests[0]['url']
        );
        $this->assertSame(
            ['type' => 'question-activity', 'uid' => 'q1'],
            json_decode($this->collabRequests[0]['body'], true)
        );
    }

    public function testAnonymousCommentsShowTheSamePseudonymAsTheCursor(): void
    {
        $anonymous = UserFactory::createOne(['plainPassword' => 'password', 'defaultAnonymous' => true]);
        $named = UserFactory::createOne(
            ['plainPassword' => 'password', 'defaultAnonymous' => false, 'fullName' => 'Nina Naam']
        );
        $anonymousToken = $this->getToken($anonymous->getUsername(), 'password');
        $namedToken = $this->getToken($named->getUsername(), 'password');
        $viewer = $this->login();
        $browser = $this->browserWithCollab();
        $exam = $this->exam();

        $this->comment($browser, $anonymousToken, $exam, 'q1', 'Anoniem.')
            ->assertStatus(201)
            ->assertJsonMatches('anonymous', true);
        $this->comment($browser, $namedToken, $exam, 'q1', 'Met naam.')->assertStatus(201);

        $displayName = self::getContainer()->get(CollabDisplayName::class);
        $this->assertInstanceOf(CollabDisplayName::class, $displayName);
        $pseudonym = $displayName->for($anonymous, $exam->getDocumentName());
        /** @var list<array{authorName: string, mine: bool}> $members */
        $members = $this->get($browser, $viewer, $this->threadUrl($exam, 'q1'))['hydra:member'];
        $this->assertSame([$pseudonym, 'Nina Naam'], array_column($members, 'authorName'));
        $this->assertSame([false, false], array_column($members, 'mine'));
        $this->assertStringStartsWith('Anonieme ', $pseudonym);
    }

    public function testAQuestionTheCollabServerHasNotStoredYetGetsItsRowOnTheSpot(): void
    {
        $token = $this->login();
        $browser = $this->browserWithCollab();
        $exam = $this->exam();

        $this->comment($browser, $token, $exam, 'fresh-question', 'Net toegevoegd.')->assertStatus(201);
        $questions = self::getContainer()->get(ExamQuestionRepository::class);
        $row = $questions->findOneBy(['exam' => $exam->getId(), 'uid' => 'fresh-question']);
        // Not a question until the document shows it is one.
        $this->assertTrue($row?->isRemoved());

        $content = ['type' => 'doc', 'content' => [
            ['type' => 'examQuestion', 'attrs' => ['id' => 'fresh-question'], 'content' => [
                ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'Leg uit.']]],
            ]],
        ]];
        self::getContainer()->get(CollabDocumentStore::class)
            ->store($exam->getDocumentName(), 'state 2', $content, null, []);
        self::getContainer()->get(EntityManagerInterface::class)->clear();

        $row = $questions->findOneBy(['exam' => $exam->getId(), 'uid' => 'fresh-question']);
        $this->assertInstanceOf(ExamQuestion::class, $row);
        $this->assertFalse($row->isRemoved());
        $this->assertSame('Leg uit.', $row->getText());
    }

    public function testOnlyTheAuthorEditsAndDeletesAComment(): void
    {
        $author = $this->login();
        $other = $this->login();
        $browser = $this->browserWithCollab();
        $exam = $this->exam();
        $iri = $this->comment($browser, $author, $exam, 'q1', 'Eerste versie.')->json()->decoded()['@id'];

        $patch = static fn(string $token, string $content): array => [
            'headers' => ['Authorization' => 'Bearer ' . $token, 'Content-Type' => 'application/merge-patch+json'],
            'json' => ['content' => $content],
        ];

        $browser->patch($iri, $patch($other, 'Gekaapt.'))->assertStatus(403);
        $browser->delete($iri, ['headers' => ['Authorization' => 'Bearer ' . $other]])->assertStatus(403);

        $browser->patch($iri, $patch($author, 'Tweede versie.'))
            ->assertStatus(200)
            ->assertJsonMatches('content', 'Tweede versie.');
        $browser->delete($iri, ['headers' => ['Authorization' => 'Bearer ' . $author]])->assertStatus(204);
        $this->assertSame([], $this->get($browser, $author, $this->threadUrl($exam, 'q1'))['hydra:member']);
    }

    public function testInvalidCommentsAreRefused(): void
    {
        $token = $this->login();
        $browser = $this->browserWithCollab();
        $exam = $this->exam();

        $this->comment($browser, $token, $exam, 'q1', "  \n ")->assertStatus(422);
        $this->comment($browser, $token, $exam, 'q1', str_repeat('x', 2001))->assertStatus(422);
        $this->comment($browser, $token, $exam, 'q1/../x', 'Hm.')->assertStatus(422);
        $withoutExam = ['questionUid' => 'q1', 'content' => 'Zonder examen.'];
        $this->post($browser, $token, '/api/exam_question_comments', $withoutExam)->assertStatus(422);
        $this->assertSame([], $this->collabRequests);
    }

    public function testCommentsAndConfirmationsStayOpenAfterALock(): void
    {
        $token = $this->login();
        $browser = $this->browserWithCollab();
        $exam = $this->exam(['editableUntil' => new DateTimeImmutable('-1 day')]);

        $this->comment($browser, $token, $exam, 'q1', 'Achteraf nog een vraag.')->assertStatus(201);
        $this->confirm($browser, $token, $exam, 'q1', true)->assertStatus(200);
    }

    public function testATroubledCollabServerDoesNotLoseTheComment(): void
    {
        $token = $this->login();
        $browser = $this->browserWithCollab();
        $this->collabStatus = 503;
        $exam = $this->exam();

        $this->comment($browser, $token, $exam, 'q1', 'Toch bewaard.')->assertStatus(201);
        $this->assertCount(1, $this->get($browser, $token, $this->threadUrl($exam, 'q1'))['hydra:member']);
    }

    public function testCommentingIsLimitedPerUserExceptForModerators(): void
    {
        $token = $this->login();
        $moderator = $this->login(roles: [User::ROLE_MODERATOR]);
        $browser = $this->browserWithCollab();
        $exam = $this->exam();

        for ($i = 1; $i <= 20; $i++) {
            $this->comment($browser, $token, $exam, 'q1', 'Reactie ' . $i)->assertStatus(201);
        }
        $response = $this->comment($browser, $token, $exam, 'q1', 'Eén te veel.')
            ->assertStatus(429)
            ->client()
            ->getResponse();
        $this->assertGreaterThan(0, (int) $response->headers->get('Retry-After'));

        $this->comment($browser, $moderator, $exam, 'q1', 'Moderator.')->assertStatus(201);
    }

    public function testStatsCountCommentsAndConfirmations(): void
    {
        $me = $this->login();
        $other = $this->login();
        $browser = $this->browserWithCollab();
        $exam = $this->exam();

        $this->comment($browser, $other, $exam, 'q1', 'Een.')->assertStatus(201);
        $this->comment($browser, $other, $exam, 'q1', 'Twee.')->assertStatus(201);
        $this->confirm($browser, $other, $exam, 'q1', true)->assertStatus(200);
        $this->confirm($browser, $other, $exam, 'q2', true)->assertStatus(200);
        $this->confirm($browser, $me, $exam, 'q2', true)->assertStatus(200);

        $stats = $this->get($browser, $me, '/api/exams/' . $exam->getId() . '/question_stats');
        $this->assertSame(
            [
                ['uid' => 'q1', 'comments' => 2, 'confirmations' => 1, 'confirmed' => false],
                ['uid' => 'q2', 'comments' => 0, 'confirmations' => 2, 'confirmed' => true],
            ],
            $stats['questions']
        );
    }

    public function testConfirmingIsAToggleThatCountsOncePerUser(): void
    {
        $token = $this->login();
        $browser = $this->browserWithCollab();
        $exam = $this->exam();

        $this->confirm($browser, $token, $exam, 'q1', true)
            ->assertStatus(200)
            ->assertJsonMatches('questions[0].confirmations', 1)
            ->assertJsonMatches('questions[0].confirmed', true);
        // Again: nothing changes, and nobody is bothered with it.
        $this->confirm($browser, $token, $exam, 'q1', true)->assertJsonMatches('questions[0].confirmations', 1);
        $this->assertCount(1, $this->collabRequests);

        $this->confirm($browser, $token, $exam, 'q1', false)
            ->assertStatus(200)
            ->assertJsonMatches('length(questions)', 0);
        $this->assertCount(2, $this->collabRequests);

        $this->confirm($browser, $token, $exam, 'not a uid', true)->assertStatus(422);
        $this->post($browser, $token, '/api/exams/999999/confirmations', ['questionUid' => 'q1', 'confirmed' => true])
            ->assertStatus(404);
        $browser->get('/api/exams/999999/question_stats', ['headers' => ['Authorization' => 'Bearer ' . $token]])
            ->assertStatus(404);
    }
}
