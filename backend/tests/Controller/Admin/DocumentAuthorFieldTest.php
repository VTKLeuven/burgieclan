<?php

namespace App\Tests\Controller\Admin;

use App\Entity\Document;
use App\Entity\User;
use App\Factory\DocumentFactory;
use App\Factory\UserFactory;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Zenstruck\Foundry\Test\Factories;
use Zenstruck\Foundry\Test\ResetDatabase;

/**
 * Document::author is filled in only by the Seafile import, and the site never asks for it on
 * upload, so the admin form is the single place it can be corrected. That makes it easy to break
 * without anyone noticing: nothing else writes the column, and a field dropped from
 * configureFields() would just silently stop saving.
 */
class DocumentAuthorFieldTest extends WebTestCase
{
    use Factories;
    use ResetDatabase;

    private function moderator(): User
    {
        return UserFactory::createOne(['roles' => [User::ROLE_MODERATOR]]);
    }

    public function testEditFormExplainsWhatTheAuthorFieldIsFor(): void
    {
        $client = static::createClient();
        $client->loginUser($this->moderator());

        $document = DocumentFactory::createOne(['under_review' => false]);

        $crawler = $client->request('GET', 'https://localhost/admin/document/' . $document->getId() . '/edit');
        self::assertResponseIsSuccessful();

        self::assertSelectorExists('#Document_author');
        self::assertStringContainsString('Original author', $crawler->filter('body')->html());
        self::assertStringContainsString(
            'migrated from the old archive',
            $crawler->filter('body')->html(),
            'Moderators need to be told the field is about legacy files, not ordinary uploads.'
        );
    }

    public function testModeratorCanSetTheAuthorOnAMigratedDocument(): void
    {
        $client = static::createClient();
        $client->loginUser($this->moderator());

        $document = DocumentFactory::createOne(['under_review' => false]);
        $documentId = $document->getId();

        $crawler = $client->request('GET', 'https://localhost/admin/document/' . $documentId . '/edit');
        self::assertResponseIsSuccessful();

        $form = $crawler->selectButton('Save changes')->form();
        $form['Document[author]'] = 'Jan Peeters';
        $client->submit($form);
        self::assertResponseRedirects();

        /** @var EntityManagerInterface $entityManager */
        $entityManager = static::getContainer()->get(EntityManagerInterface::class);
        $entityManager->clear();

        $saved = $entityManager->getRepository(Document::class)->find($documentId);
        self::assertInstanceOf(Document::class, $saved);
        self::assertSame('Jan Peeters', $saved->getAuthor());
    }
}
