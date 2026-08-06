<?php

namespace App\Tests\Controller\Admin;

use App\Entity\User;
use App\Factory\DocumentFactory;
use App\Factory\UserFactory;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Zenstruck\Foundry\Test\Factories;
use Zenstruck\Foundry\Test\ResetDatabase;

/**
 * The admin templates decide what to preview through the Twig functions backed by
 * {@see \App\Constants\PreviewableFile}, rather than by listing extensions inline.
 *
 * Worth covering end to end because the failure mode is quiet: if the Twig extension
 * is not registered, `is_previewable_pdf()` is an unknown function and the whole edit
 * page 500s; if it is registered but wrong, the page renders perfectly well with the
 * preview panel silently missing.
 */
class DocumentPreviewRenderingTest extends WebTestCase
{
    use Factories;
    use ResetDatabase;

    private function admin(): User
    {
        return UserFactory::createOne(['roles' => [User::ROLE_SUPER_ADMIN]]);
    }

    public function testPdfEditPageShowsThePdfPreview(): void
    {
        $client = static::createClient();
        $client->loginUser($this->admin());

        // Upper-case on purpose: uploads keep their original casing.
        $document = DocumentFactory::createOne(['file_name' => 'lecture-notes.PDF']);

        $crawler = $client->request('GET', 'https://localhost/admin/document/' . $document->getId() . '/edit');

        self::assertResponseIsSuccessful();
        self::assertGreaterThan(0, $crawler->filter('#pdf-edit-preview-container')->count());
        self::assertStringContainsString('fa-file-pdf', $crawler->html());
    }

    public function testImageEditPageShowsTheImagePreview(): void
    {
        $client = static::createClient();
        $client->loginUser($this->admin());

        $document = DocumentFactory::createOne(['file_name' => 'scan.png']);

        $crawler = $client->request('GET', 'https://localhost/admin/document/' . $document->getId() . '/edit');

        self::assertResponseIsSuccessful();
        self::assertGreaterThan(0, $crawler->filter('#pdf-edit-preview-container img')->count());
        self::assertStringContainsString('fa-file-image', $crawler->html());
    }

    public function testUnpreviewableFileGetsNoPreviewPanel(): void
    {
        $client = static::createClient();
        $client->loginUser($this->admin());

        $document = DocumentFactory::createOne(['file_name' => 'archive.zip']);

        $crawler = $client->request('GET', 'https://localhost/admin/document/' . $document->getId() . '/edit');

        self::assertResponseIsSuccessful();
        self::assertSame(0, $crawler->filter('#pdf-edit-preview-container')->count());
    }

    public function testIndexTogglePassesTheFileTypeToTheJavascript(): void
    {
        $client = static::createClient();
        $client->loginUser($this->admin());

        DocumentFactory::createOne(['file_name' => 'scan.png']);

        $crawler = $client->request('GET', 'https://localhost/admin/document');

        self::assertResponseIsSuccessful();
        self::assertGreaterThan(0, $crawler->filter('.toggle-pdf-btn[data-file-type="image"]')->count());
    }
}
