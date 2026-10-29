<?php

namespace App\Tests\Controller\Admin;

use App\Entity\Document;
use App\Entity\User;
use App\Factory\DocumentFactory;
use App\Factory\UserFactory;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Zenstruck\Foundry\Test\ResetDatabase;

/**
 * The approve button on each row of the pending documents list.
 * @see DocumentPendingBatchActionsTest for approving several at once
 */
class DocumentPendingApproveTest extends WebTestCase
{
    use ResetDatabase;

    private function moderatorClient(): KernelBrowser
    {
        $client = static::createClient();
        $client->loginUser(UserFactory::createOne(['roles' => [User::ROLE_MODERATOR]]));

        return $client;
    }

    public function testTheApproveButtonApprovesTheDocument(): void
    {
        $client = $this->moderatorClient();
        $document = DocumentFactory::createOne(['under_review' => true]);

        $crawler = $client->request('GET', 'https://localhost/admin/document-pending');
        self::assertResponseIsSuccessful();
        // "Approve Selected" in the batch bar is a button too, but not in a form of its own.
        $row = $crawler->filter('form[action*="/admin/document-pending/approve"]');
        $client->submit($row->selectButton('Approve')->form());

        self::assertResponseRedirects();
        self::assertStringContainsString(
            sprintf('/admin/document-pending/%d/edit', $document->getId()),
            $client->getResponse()->headers->get('Location')
        );
        self::assertFalse($this->isUnderReview($document->getId()));
    }

    /**
     * Another site, or another *.vtk.be subdomain, can make a moderator's browser post here, but
     * it cannot read the token off the page. The route also answers GET, which must not approve
     * anything either.
     *
     * @param array<string, string> $parameters
     */
    #[DataProvider('requestsWithoutAValidToken')]
    public function testApprovingWithoutAValidTokenChangesNothing(string $method, array $parameters): void
    {
        $client = $this->moderatorClient();
        $document = DocumentFactory::createOne(['under_review' => true]);

        $client->request(
            $method,
            'https://localhost/admin/document-pending/approve?entityId=' . $document->getId(),
            $parameters
        );
        self::assertResponseRedirects();
        $crawler = $client->followRedirect();

        self::assertStringContainsString('Invalid CSRF token', $crawler->filter('.alert-danger')->text());
        self::assertTrue($this->isUnderReview($document->getId()));
    }

    public static function requestsWithoutAValidToken(): iterable
    {
        yield 'POST without a token' => ['POST', []];
        yield 'POST with a forged token' => ['POST', ['_token' => 'forged']];
        yield 'GET' => ['GET', []];
    }

    /**
     * Reads the flag straight from the database, past the identity map.
     */
    private function isUnderReview(int $documentId): bool
    {
        $entityManager = static::getContainer()->get(EntityManagerInterface::class);
        $entityManager->clear();

        return $entityManager->find(Document::class, $documentId)->isUnderReview();
    }
}
