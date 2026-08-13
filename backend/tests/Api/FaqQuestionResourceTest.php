<?php

namespace App\Tests\Api;

use App\Entity\FaqQuestion;
use App\Entity\User;
use App\Factory\FaqQuestionFactory;
use App\Factory\UserFactory;
use App\Repository\FaqQuestionRepository;
use PHPUnit\Framework\Attributes\DataProvider;

class FaqQuestionResourceTest extends ApiTestCase
{
    public function testPostToCreateFaqQuestion(): void
    {
        $this->browser()
            ->post(
                '/api/faq_questions',
                [
                    'json' => [
                        'question' => 'Hoe upload ik een oud examen?',
                        'locale' => 'nl',
                    ],
                    'headers' => [
                        'Content-Type' => 'application/ld+json',
                        'Authorization' => 'Bearer ' . $this->token,
                    ],
                ]
            )
            ->assertStatus(201)
            ->assertJsonMatches('question', 'Hoe upload ik een oud examen?')
            ->assertJsonMatches('locale', 'nl')
            ->assertJsonMatches('type', FaqQuestion::TYPE_GENERAL)
            // Everything arrives unhandled; only the admin moves it on.
            ->assertJsonMatches('status', FaqQuestion::STATUS_NEW);
    }

    public function testPostToCreateCourseIssueComplaint(): void
    {
        $this->browser()
            ->post(
                '/api/faq_questions',
                [
                    'json' => [
                        'question' => 'Het oefenzitting van Analyse III was slecht georganiseerd.',
                        'locale' => 'nl',
                        'type' => FaqQuestion::TYPE_COURSE_ISSUE,
                    ],
                    'headers' => [
                        'Content-Type' => 'application/ld+json',
                        'Authorization' => 'Bearer ' . $this->token,
                    ],
                ]
            )
            ->assertStatus(201)
            ->assertJsonMatches('type', FaqQuestion::TYPE_COURSE_ISSUE);
    }

    /**
     * The asker comes from the token, never the payload — otherwise anyone could file questions
     * under someone else's name.
     */
    public function testPostAttributesQuestionToAuthenticatedUser(): void
    {
        $user = UserFactory::createOne(['plainPassword' => 'password']);

        $this->browser()
            ->post(
                '/api/faq_questions',
                [
                    'json' => ['question' => 'Wie stelt deze vraag eigenlijk?', 'locale' => 'nl'],
                    'headers' => [
                        'Content-Type' => 'application/ld+json',
                        'Authorization' => 'Bearer ' . $this->getToken($user->getUsername(), 'password'),
                    ],
                ]
            )
            ->assertStatus(201);

        /** @var FaqQuestionRepository $repository */
        $repository = self::getContainer()->get(FaqQuestionRepository::class);
        $question = $repository->findOneBy(['question' => 'Wie stelt deze vraag eigenlijk?']);

        $this->assertNotNull($question);
        $this->assertSame($user->getId(), $question->getAuthor()?->getId());
    }

    public function testPostCannotForgeStatus(): void
    {
        $this->browser()
            ->post(
                '/api/faq_questions',
                [
                    'json' => [
                        'question' => 'Mag ik mijn eigen vraag afvinken?',
                        'locale' => 'nl',
                        'status' => FaqQuestion::STATUS_HANDLED,
                    ],
                    'headers' => [
                        'Content-Type' => 'application/ld+json',
                        'Authorization' => 'Bearer ' . $this->token,
                    ],
                ]
            )
            ->assertStatus(201)
            ->assertJsonMatches('status', FaqQuestion::STATUS_NEW);
    }

    #[DataProvider('invalidQuestionProvider')]
    public function testPostRejectsInvalidQuestions(array $payload): void
    {
        $this->browser()
            ->post(
                '/api/faq_questions',
                [
                    'json' => $payload,
                    'headers' => [
                        'Content-Type' => 'application/ld+json',
                        'Authorization' => 'Bearer ' . $this->token,
                    ],
                ]
            )
            ->assertStatus(422);
    }

    public static function invalidQuestionProvider(): iterable
    {
        yield 'blank' => [['question' => '', 'locale' => 'nl']];
        yield 'too short' => [['question' => 'kort', 'locale' => 'nl']];
        yield 'too long' => [['question' => str_repeat('a', 2001), 'locale' => 'nl']];
        yield 'unsupported locale' => [['question' => 'Is dit een geldige vraag?', 'locale' => 'de']];
    }

    public function testPostRequiresAuthentication(): void
    {
        $this->browser()
            ->post(
                '/api/faq_questions',
                [
                    'json' => ['question' => 'Anoniem vragen mag niet.', 'locale' => 'nl'],
                    'headers' => ['Content-Type' => 'application/ld+json'],
                ]
            )
            ->assertStatus(401);
    }

    public function testGetIsRestrictedToAdmins(): void
    {
        $question = FaqQuestionFactory::createOne();

        $this->browser()
            ->get(
                '/api/faq_questions/' . $question->getId(),
                ['headers' => ['Authorization' => 'Bearer ' . $this->token]]
            )
            ->assertStatus(403);

        $admin = UserFactory::createOne(['plainPassword' => 'password', 'roles' => [User::ROLE_ADMIN]]);

        $this->browser()
            ->get(
                '/api/faq_questions/' . $question->getId(),
                [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->getToken($admin->getUsername(), 'password'),
                    ],
                ]
            )
            ->assertStatus(200);
    }

    /**
     * No GetCollection is declared, so listing what everyone has asked is not reachable.
     */
    public function testCollectionCannotBeListed(): void
    {
        FaqQuestionFactory::createMany(3);

        $this->browser()
            ->get(
                '/api/faq_questions',
                ['headers' => ['Authorization' => 'Bearer ' . $this->token]]
            )
            ->assertStatus(405);
    }

    public function testRepositoryCountsOnlyNewQuestions(): void
    {
        FaqQuestionFactory::createMany(2);
        FaqQuestionFactory::createOne(['status' => FaqQuestion::STATUS_HANDLED]);
        FaqQuestionFactory::createOne(['status' => FaqQuestion::STATUS_ARCHIVED]);

        /** @var FaqQuestionRepository $repository */
        $repository = self::getContainer()->get(FaqQuestionRepository::class);

        $this->assertEquals(2, $repository->getAmountNew());
    }
}
