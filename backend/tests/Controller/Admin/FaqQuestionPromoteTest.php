<?php

namespace App\Tests\Controller\Admin;

use App\Entity\FaqQuestion;
use App\Entity\User;
use App\Factory\FaqQuestionFactory;
use App\Factory\UserFactory;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Zenstruck\Foundry\Test\Factories;
use Zenstruck\Foundry\Test\ResetDatabase;

/**
 * The promote action is the whole point of the FAQ questions inbox, and it is the step most likely
 * to break silently: it redirects across two CRUD controllers, and AdminUrlGenerator carries the
 * source request's parameters along unless they are unset. An entityId left in the redirect points
 * the FaqItem NEW page at a non-existent item and turns the whole flow into a 404 — which is
 * exactly what happened the first time it was wired up.
 */
class FaqQuestionPromoteTest extends WebTestCase
{
    use Factories;
    use ResetDatabase;

    private function admin(): User
    {
        return UserFactory::createOne(['roles' => [User::ROLE_ADMIN]]);
    }

    public function testPromoteMarksHandledAndOpensAPrefilledFaqItemForm(): void
    {
        $client = static::createClient();
        $client->loginUser($this->admin());

        $question = FaqQuestionFactory::createOne(
            [
                'question' => 'Hoe upload ik een oud examen?',
                'locale' => 'nl',
            ]
        );

        $client->request('POST', 'https://localhost/admin/faq-question/promote?entityId=' . $question->getId());
        self::assertResponseRedirects();

        $location = $client->getResponse()->headers->get('Location');
        self::assertStringContainsString('/admin/faq-item/new', $location);
        self::assertStringNotContainsString(
            'entityId',
            $location,
            'the question id leaked into the FaqItem NEW url, which makes it 404'
        );

        $crawler = $client->followRedirect();
        self::assertResponseIsSuccessful();

        self::assertSame(
            'Hoe upload ik een oud examen?',
            $crawler->filter('input[name="FaqItem[question_nl]"]')->attr('value'),
            'the Dutch question should be carried into the Dutch field'
        );
        self::assertEmpty($crawler->filter('input[name="FaqItem[question_en]"]')->attr('value'));

        self::assertSame(FaqQuestion::STATUS_HANDLED, $this->statusOf($question->getId()));
    }

    public function testPromotingAnEnglishQuestionFillsTheEnglishField(): void
    {
        $client = static::createClient();
        $client->loginUser($this->admin());

        $question = FaqQuestionFactory::createOne(
            [
                'question' => 'How do I download a whole course at once?',
                'locale' => 'en',
            ]
        );

        $client->request('POST', 'https://localhost/admin/faq-question/promote?entityId=' . $question->getId());
        $crawler = $client->followRedirect();
        self::assertResponseIsSuccessful();

        self::assertSame(
            'How do I download a whole course at once?',
            $crawler->filter('input[name="FaqItem[question_en]"]')->attr('value')
        );
        // Dutch is the required field and the frontend's fallback, so it is left for the admin.
        self::assertEmpty($crawler->filter('input[name="FaqItem[question_nl]"]')->attr('value'));
    }

    public function testMarkHandledReturnsToTheInbox(): void
    {
        $client = static::createClient();
        $client->loginUser($this->admin());

        $question = FaqQuestionFactory::createOne();

        $client->request('POST', 'https://localhost/admin/faq-question/mark-handled?entityId=' . $question->getId());
        self::assertResponseRedirects();
        self::assertStringContainsString('/admin/faq-question', $client->getResponse()->headers->get('Location'));

        self::assertSame(FaqQuestion::STATUS_HANDLED, $this->statusOf($question->getId()));
    }

    /**
     * A plain FaqItem NEW page must still work — the prefill is opt-in via the query parameter.
     */
    public function testNewFaqItemFormWithoutPromotionIsEmpty(): void
    {
        $client = static::createClient();
        $client->loginUser($this->admin());

        $crawler = $client->request('GET', 'https://localhost/admin/faq-item/new');
        self::assertResponseIsSuccessful();
        self::assertEmpty($crawler->filter('input[name="FaqItem[question_nl]"]')->attr('value'));
    }

    /**
     * Reads the status straight from the database, past the identity map.
     */
    private function statusOf(int $questionId): string
    {
        $entityManager = static::getContainer()->get('doctrine')->getManager();
        $entityManager->clear();

        return $entityManager->getRepository(FaqQuestion::class)->find($questionId)->getStatus();
    }
}
