<?php

namespace App\Tests\Controller;

use App\Factory\DocumentFactory;
use App\Service\PresignedUrlGenerator;
use App\Tests\Api\ApiTestCase;
use Aws\S3\S3Client;

class DownloadControllerTest extends ApiTestCase
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

    private function storeFile(string $name, string $contents): string
    {
        $path = \dirname(__DIR__, 2) . '/data/documents/' . $name;
        $dir = \dirname($path);
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }
        file_put_contents($path, $contents);
        $this->createdFiles[] = $path;

        return $name;
    }

    public function testUnauthenticatedRequestIsRejected(): void
    {
        $this->browser()
            ->get('/files/download/some-file.pdf')
            ->assertStatus(401);
    }

    public function testNonExistentDocumentReturns404(): void
    {
        $this->browser()
            ->get(
                '/files/download/non-existent-file.pdf',
                [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->token,
                    ],
                ]
            )
            ->assertStatus(404);
    }

    public function testLocalFallbackServesAttachmentDownload(): void
    {
        $storedName = $this->storeFile('phpunit-download-test-1.pdf', "%PDF-1.7\nTest content");
        DocumentFactory::createOne(
            [
            'name' => 'Calculus Exam Solutions',
            'file_name' => $storedName,
            'under_review' => false,
            ]
        );

        $this->browser()
            ->get(
                '/files/download/' . $storedName,
                [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->token,
                    ],
                ]
            )
            ->assertStatus(200)
            ->assertHeaderContains('Content-Disposition', 'attachment')
            ->assertHeaderContains('Content-Disposition', 'Calculus Exam Solutions.pdf');
    }

    public function testLocalFallbackServesInlinePreview(): void
    {
        $storedName = $this->storeFile('phpunit-preview-test-1.pdf', "%PDF-1.7\nTest content");
        DocumentFactory::createOne(
            [
            'name' => 'Calculus Summary',
            'file_name' => $storedName,
            'under_review' => false,
            ]
        );

        $this->browser()
            ->get(
                '/files/download/' . $storedName . '?inline=1',
                [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->token,
                    ],
                ]
            )
            ->assertStatus(200)
            ->assertHeaderContains('Content-Disposition', 'inline')
            ->assertHeaderContains('Content-Type', 'application/pdf');
    }

    public function testPresignedUrlRedirectsWhenS3IsEnabled(): void
    {
        $storedName = 's3-download-test.pdf';
        DocumentFactory::createOne(
            [
            'name' => 'Physics Lecture Notes',
            'file_name' => $storedName,
            'under_review' => false,
            ]
        );

        // Inject an active PresignedUrlGenerator backed by real in-memory SigV4 S3Client
        $s3Client = new S3Client(
            [
            'version' => 'latest',
            'region' => 'eu-west-1',
            'endpoint' => 'https://s3.leuven.vtk.be',
            'use_path_style_endpoint' => true,
            'credentials' => [
                'key' => 'TEST_KEY',
                'secret' => 'TEST_SECRET',
            ],
            ]
        );
        $generator = new PresignedUrlGenerator($s3Client, 'burgieclan-bucket', 'documents', 10);

        $browser = $this->browser(['follow_redirects' => false]);
        $browser->client()->disableReboot();
        $browser->client()->getContainer()->set(PresignedUrlGenerator::class, $generator);

        $response = $browser
            ->get(
                '/files/download/' . $storedName,
                [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->token,
                    ],
                ]
            )
            ->assertStatus(302)
            ->assertHeaderContains('Cache-Control', 'private, no-cache');

        $location = $response->response()->headers()->get('location');
        $this->assertNotNull($location);
        $this->assertStringStartsWith(
            'https://s3.leuven.vtk.be/burgieclan-bucket/documents/' . $storedName . '?',
            $location
        );
        $this->assertStringContainsString('X-Amz-Signature=', $location);
        $this->assertStringContainsString('response-content-disposition=', $location);
    }
}
