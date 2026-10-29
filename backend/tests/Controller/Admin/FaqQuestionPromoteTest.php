<?php

namespace App\Tests\Controller\Admin;

use App\Entity\FaqQuestion;
use App\Entity\User;
use App\Factory\FaqQuestionFactory;
use App\Factory\UserFactory;
use PHPUnit\Framework\Attributes\DataProvider;
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

        $crawler = $client->request('GET', 'https://localhost/admin/faq-question');
        $client->submit($crawler->selectButton('Promote')->form());
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

        // From the detail page this time, which renders the same button.
        $crawler = $client->request('GET', 'https://localhost/admin/faq-question/' . $question->getId());
        $client->submit($crawler->selectButton('Promote')->form());
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

        $crawler = $client->request('GET', 'https://localhost/admin/faq-question');
        $client->submit($crawler->selectButton('Mark handled')->form());
        self::assertResponseRedirects();
        self::assertStringContainsString('/admin/faq-question', $client->getResponse()->headers->get('Location'));

        self::assertSame(FaqQuestion::STATUS_HANDLED, $this->statusOf($question->getId()));
    }

    /**
     * Another site, or another *.vtk.be subdomain, can make an admin's browser post here, but it
     * cannot read the token off the page.
     */
    #[DataProvider('stateChangingActionPaths')]
    public function testActionsWithoutAValidTokenChangeNothing(string $path): void
    {
        $client = static::createClient();
        $client->loginUser($this->admin());

        $question = FaqQuestionFactory::createOne();
        $url = sprintf('https://localhost/admin/faq-question/%s?entityId=%d', $path, $question->getId());

        $client->request('POST', $url);
        self::assertResponseRedirects();
        $client->request('POST', $url, ['_token' => 'forged']);
        self::assertResponseRedirects();
        self::assertStringNotContainsString('/admin/faq-item', $client->getResponse()->headers->get('Location'));
        $crawler = $client->followRedirect();

        self::assertStringContainsString('Invalid CSRF token', $crawler->filter('.alert-danger')->text());
        self::assertSame(FaqQuestion::STATUS_NEW, $this->statusOf($question->getId()));
    }

    public static function stateChangingActionPaths(): iterable
    {
        yield 'promote' => ['promote'];
        yield 'mark handled' => ['mark-handled'];
    }

    /**
     * Both actions change state, so neither may be reachable by GET. The token check would also
     * stop a bare <img src="...promote?entityId=1">, since it only reads the POST body, but the
     * method restriction does not depend on each action remembering to check.
     *
     * Asserted against the route collection rather than by firing a GET: once the POST-only route
     * stops matching, the request falls through to admin_faq_question_detail (GET /{entityId},
     * no numeric requirement), which tries find('promote') and raises a Postgres 22P02. That
     * aborts the transaction dama/doctrine-test-bundle wraps the test in, so nothing can be read
     * back afterwards to prove the action did not run. The route config is the property anyway.
     */
    #[DataProvider('stateChangingActions')]
    public function testStateChangingActionsRejectGet(string $routeName): void
    {
        self::bootKernel();

        $route = static::getContainer()->get('router')->getRouteCollection()->get($routeName);

        self::assertNotNull($route, sprintf('route %s is gone; the action was renamed or removed', $routeName));
        self::assertSame(['POST'], $route->getMethods(), sprintf('%s must not be reachable by GET', $routeName));
    }

    public static function stateChangingActions(): iterable
    {
        yield 'promote' => ['admin_faq_question_promote'];
        yield 'mark handled' => ['admin_faq_question_markHandled'];
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
