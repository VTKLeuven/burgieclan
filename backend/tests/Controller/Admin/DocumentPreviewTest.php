<?php

namespace App\Tests\Controller\Admin;

use App\Entity\User;
use App\Factory\DocumentFactory;
use App\Factory\UserFactory;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Zenstruck\Foundry\Test\Factories;
use Zenstruck\Foundry\Test\ResetDatabase;

/**
 * The reviewer's view of an uploaded file used to be silently broken for every type that
 * could not be drawn inline. Three separate faults stacked up, and each is pinned here:
 *
 *  - the download link was labelled with the mapping's `originalName`, which this mapping
 *    does not have, so the anchor rendered empty and was invisible;
 *  - it pointed at /files/download, which is behind the stateless JWT firewall and answers
 *    401 to a session-authenticated moderator;
 *  - the preview card - the only place a working link lived - was suppressed entirely for
 *    anything outside a short list of drawable types.
 *
 * PDFs hid all three, because their preview panel rendered and showed the file anyway.
 */
class DocumentPreviewTest extends WebTestCase
{
    use Factories;
    use ResetDatabase;

    /** @var string[] */
    private array $createdFiles = [];

    protected function tearDown(): void
    {
        foreach ($this->createdFiles as $path) {
            if (is_file($path)) {
                unlink($path);
            }
        }
        $this->createdFiles = [];
        parent::tearDown();
    }

    private function storeFile(string $name, string $contents): string
    {
        $path = \dirname(__DIR__, 3) . '/data/documents/' . $name;
        file_put_contents($path, $contents);
        $this->createdFiles[] = $path;

        return $name;
    }

    private function moderator(): User
    {
        return UserFactory::createOne(['roles' => [User::ROLE_MODERATOR]]);
    }

    public function testMatlabSourceIsServedAsReadableText(): void
    {
        $client = static::createClient();
        $client->loginUser($this->moderator());

        $name = $this->storeFile('phpunit-preview-test.m', "function y = f(x)\n  y = x + 1;\nend\n");
        DocumentFactory::createOne(['file_name' => $name, 'under_review' => true]);

        $client->request('GET', 'https://localhost/admin/document-preview/' . $name);

        self::assertResponseIsSuccessful();
        self::assertResponseHeaderSame('Content-Type', 'text/plain; charset=utf-8');
        self::assertResponseHeaderSame('Content-Disposition', 'inline');
    }

    public function testUndrawableFileIsOfferedAsANamedDownload(): void
    {
        $client = static::createClient();
        $client->loginUser($this->moderator());

        $name = $this->storeFile('phpunit-preview-test.zip', 'not really a zip');
        DocumentFactory::createOne(['file_name' => $name, 'under_review' => true]);

        $client->request('GET', 'https://localhost/admin/document-preview/' . $name);

        self::assertResponseIsSuccessful();
        // Not "inline": that contradicted application/octet-stream + nosniff, and browsers
        // resolved it by saving a file with no usable name.
        self::assertStringStartsWith(
            'attachment',
            (string) $client->getResponse()->headers->get('Content-Disposition')
        );
        self::assertStringContainsString(
            $name,
            (string) $client->getResponse()->headers->get('Content-Disposition')
        );
    }

    /**
     * The regression that started all of this: a moderator opening a zip saw no sign that
     * the document had a file at all.
     */
    public function testEditPageLinksToTheFileEvenWhenItCannotBePreviewed(): void
    {
        $client = static::createClient();
        $client->loginUser($this->moderator());

        $name = $this->storeFile('phpunit-preview-test.zip', 'not really a zip');
        $document = DocumentFactory::createOne(['file_name' => $name, 'under_review' => true]);

        $crawler = $client->request('GET', 'https://localhost/admin/document/' . $document->getId() . '/edit');
        self::assertResponseIsSuccessful();

        $link = $crawler->filter('a.ea-vich-file-name');
        self::assertCount(1, $link);
        self::assertSame($name, trim($link->text()), 'The link must carry visible text, or it cannot be seen.');
        self::assertStringContainsString('/admin/document-preview/', $link->attr('href'));
        self::assertStringNotContainsString(
            '/files/download/',
            $link->attr('href'),
            'That route is JWT-only and 401s for a session-authenticated moderator.'
        );
    }
}
