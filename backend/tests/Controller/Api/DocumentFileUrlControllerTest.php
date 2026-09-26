<?php

namespace App\Tests\Controller\Api;

use App\Entity\User;
use App\Factory\DocumentFactory;
use App\Factory\UserFactory;
use App\Service\PresignedUrlGenerator;
use App\Tests\Api\ApiTestCase;
use Aws\S3\S3Client;

class DocumentFileUrlControllerTest extends ApiTestCase
{
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

    private function storeFile(string $name, string $contents = "%PDF-1.7\nTest content"): string
    {
        $path = \dirname(__DIR__, 3) . '/data/documents/' . $name;
        if (!is_dir(\dirname($path))) {
            mkdir(\dirname($path), 0775, true);
        }
        file_put_contents($path, $contents);
        $this->createdFiles[] = $path;

        return $name;
    }

    private function fileUrl(int $documentId, string $token, string $query = ''): \Zenstruck\Browser\KernelBrowser
    {
        return $this->browser()->get(
            '/api/documents/' . $documentId . '/file-url' . $query,
            ['headers' => ['Authorization' => 'Bearer ' . $token]]
        );
    }

    private function tokenFor(array $roles = [User::ROLE_USER]): string
    {
        $user = UserFactory::createOne(['plainPassword' => 'password', 'roles' => $roles]);

        return $this->getToken($user->getUsername(), 'password');
    }

    public function testUnauthenticatedRequestIsRejected(): void
    {
        $document = DocumentFactory::createOne(['file_name' => $this->storeFile('file-url-test-0.pdf')]);

        $this->browser()
            ->get('/api/documents/' . $document->getId() . '/file-url')
            ->assertStatus(401);
    }

    public function testReturnsASignedLinkThatWorksWithoutTheCookie(): void
    {
        $storedName = $this->storeFile('file-url-test-1.pdf');
        $document = DocumentFactory::createOne(
            [
            'name' => 'Calculus Exam Solutions',
            'file_name' => $storedName,
            'under_review' => false,
            ]
        );

        $url = $this->fileUrl($document->getId(), $this->token)
            ->assertStatus(200)
            ->assertHeaderContains('Cache-Control', 'no-store')
            ->json()
            ->decoded()['url'];

        $this->assertStringStartsWith('/files/signed/' . $storedName . '?', $url);
        $this->assertStringContainsString('_expiration=', $url);
        $this->assertStringContainsString('_hash=', $url);

        // No Authorization header: the signature alone grants access.
        $this->browser()
            ->get($url)
            ->assertStatus(200)
            ->assertHeaderContains('Content-Disposition', 'attachment')
            ->assertHeaderContains('Content-Disposition', 'Calculus Exam Solutions.pdf');
    }

    public function testInlineLinkServesAPreview(): void
    {
        $document = DocumentFactory::createOne(
            [
            'file_name' => $this->storeFile('file-url-test-2.pdf'),
            'under_review' => false,
            ]
        );

        $url = $this->fileUrl($document->getId(), $this->token, '?inline=1')->json()->decoded()['url'];
        $this->assertStringContainsString('inline=1', $url);

        $this->browser()
            ->get($url)
            ->assertStatus(200)
            ->assertHeaderContains('Content-Disposition', 'inline')
            ->assertHeaderContains('Content-Type', 'application/pdf');
    }

    public function testTamperedOrUnsignedLinksAreRefused(): void
    {
        $document = DocumentFactory::createOne(
            [
            'file_name' => $this->storeFile('file-url-test-3.pdf'),
            'under_review' => false,
            ]
        );
        $url = $this->fileUrl($document->getId(), $this->token)->json()->decoded()['url'];

        $this->browser()->get('/files/signed/file-url-test-3.pdf')->assertStatus(403);
        // Adding a parameter changes what was signed.
        $this->browser()->get($url . '&inline=1')->assertStatus(403);
        // A signature for one file does not open another.
        $other = $this->storeFile('file-url-test-3b.pdf');
        $this->browser()->get(str_replace('file-url-test-3.pdf', $other, $url))->assertStatus(403);
    }

    public function testMissingFileReturns404(): void
    {
        $document = DocumentFactory::createOne(
            [
            'file_name' => 'file-url-test-never-stored.pdf',
            'under_review' => false,
            ]
        );

        $this->fileUrl($document->getId(), $this->token)->assertStatus(404);
    }

    public function testUnknownDocumentReturns404(): void
    {
        $this->fileUrl(999999999, $this->token)->assertStatus(404);
    }

    public function testDocumentUnderReviewIsHiddenFromOtherUsers(): void
    {
        $document = DocumentFactory::createOne(
            [
            'file_name' => $this->storeFile('file-url-test-4.pdf'),
            'under_review' => true,
            'creator' => UserFactory::createOne(),
            ]
        );

        $this->fileUrl($document->getId(), $this->token)->assertStatus(404);
    }

    public function testDocumentUnderReviewIsAvailableToItsUploader(): void
    {
        $uploader = UserFactory::createOne(['plainPassword' => 'password']);
        $document = DocumentFactory::createOne(
            [
            'file_name' => $this->storeFile('file-url-test-5.pdf'),
            'under_review' => true,
            'creator' => $uploader,
            ]
        );

        $this->fileUrl($document->getId(), $this->getToken($uploader->getUsername(), 'password'))
            ->assertStatus(200);
    }

    public function testDocumentUnderReviewIsAvailableToModeratorsAndAdmins(): void
    {
        $document = DocumentFactory::createOne(
            [
            'file_name' => $this->storeFile('file-url-test-6.pdf'),
            'under_review' => true,
            'creator' => UserFactory::createOne(),
            ]
        );

        $this->fileUrl($document->getId(), $this->tokenFor([User::ROLE_MODERATOR]))->assertStatus(200);
        // ROLE_ADMIN reaches ROLE_MODERATOR through the role hierarchy.
        $this->fileUrl($document->getId(), $this->tokenFor([User::ROLE_ADMIN]))->assertStatus(200);
    }

    public function testReturnsAPresignedBucketLinkWhenDocumentsAreOnS3(): void
    {
        $storedName = $this->storeFile('file-url-test-7.pdf');
        $document = DocumentFactory::createOne(['file_name' => $storedName, 'under_review' => false]);

        $s3Client = new S3Client(
            [
            'version' => 'latest',
            'region' => 'eu-west-1',
            'endpoint' => 'https://s3.example.test',
            'use_path_style_endpoint' => true,
            'credentials' => ['key' => 'TEST_KEY', 'secret' => 'TEST_SECRET'],
            ]
        );

        $browser = $this->browser();
        $browser->client()->disableReboot();
        $browser->client()->getContainer()->set(
            PresignedUrlGenerator::class,
            new PresignedUrlGenerator($s3Client, 'burgieclan-bucket', 'documents', 10)
        );

        $url = $browser
            ->get(
                '/api/documents/' . $document->getId() . '/file-url',
                ['headers' => ['Authorization' => 'Bearer ' . $this->token]]
            )
            ->assertStatus(200)
            ->json()
            ->decoded()['url'];

        $this->assertStringStartsWith('https://s3.example.test/burgieclan-bucket/documents/' . $storedName . '?', $url);
        $this->assertStringContainsString('X-Amz-Signature=', $url);
    }
}
