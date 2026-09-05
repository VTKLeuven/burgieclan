<?php

namespace App\Tests\Service;

use App\Entity\Document;
use App\Entity\User;
use App\Service\PresignedUrlGenerator;
use Aws\CommandInterface;
use Aws\S3\S3Client;
use GuzzleHttp\Psr7\Request;
use LogicException;
use PHPUnit\Framework\TestCase;

class PresignedUrlGeneratorTest extends TestCase
{
    private function createDocument(string $name, string $fileName): Document
    {
        $creator = $this->createStub(User::class);
        $document = new Document($creator);
        $document->setName($name);
        $document->setFileName($fileName);

        return $document;
    }

    public function testIsEnabledReturnsFalseWhenUnconfigured(): void
    {
        $generatorWithoutClient = new PresignedUrlGenerator(null, 'my-bucket');
        $this->assertFalse($generatorWithoutClient->isEnabled());

        $generatorWithoutBucket = new PresignedUrlGenerator($this->createStub(S3Client::class), null);
        $this->assertFalse($generatorWithoutBucket->isEnabled());

        $generatorWithEmptyBucket = new PresignedUrlGenerator($this->createStub(S3Client::class), '');
        $this->assertFalse($generatorWithEmptyBucket->isEnabled());
    }

    public function testIsEnabledReturnsTrueWhenConfigured(): void
    {
        $generator = new PresignedUrlGenerator($this->createStub(S3Client::class), 'my-bucket');
        $this->assertTrue($generator->isEnabled());
    }

    public function testGenerateUrlThrowsExceptionWhenDisabled(): void
    {
        $generator = new PresignedUrlGenerator(null, null);
        $document = $this->createDocument('Test Doc', 'test-123.pdf');

        $this->expectException(LogicException::class);
        $this->expectExceptionMessage('PresignedUrlGenerator is not enabled or S3 is not configured.');

        $generator->generateUrl($document);
    }

    public function testGenerateUrlForDownloadSetsAttachmentDisposition(): void
    {
        $s3Client = $this->createMock(S3Client::class);
        $command = $this->createStub(CommandInterface::class);

        $s3Client->expects($this->once())
            ->method('getCommand')
            ->with(
                'GetObject',
                $this->callback(
                    function (array $params) {
                        $this->assertSame('test-bucket', $params['Bucket']);
                        $this->assertSame('documents/stored-name-12345.pdf', $params['Key']);
                        $this->assertStringStartsWith('attachment;', $params['ResponseContentDisposition']);
                        $this->assertStringContainsString(
                            'Calculus%20Notes.pdf',
                            $params['ResponseContentDisposition']
                        );
                        $this->assertArrayNotHasKey('ResponseContentType', $params);

                        return true;
                    }
                )
            )
            ->willReturn($command);

        $s3Client->expects($this->once())
            ->method('createPresignedRequest')
            ->with($command, '+10 minutes')
            ->willReturn(
                new Request(
                    'GET',
                    'https://s3.example.com/test-bucket/documents/stored-name-12345.pdf?X-Amz-Signature=abc'
                )
            );

        $generator = new PresignedUrlGenerator($s3Client, 'test-bucket', 'documents', 10);
        $document = $this->createDocument('Calculus Notes', 'stored-name-12345.pdf');

        $url = $generator->generateUrl($document, false);

        $this->assertSame(
            'https://s3.example.com/test-bucket/documents/stored-name-12345.pdf?X-Amz-Signature=abc',
            $url
        );
    }

    public function testGenerateUrlForInlinePreviewSetsInlineDispositionAndContentType(): void
    {
        $s3Client = $this->createMock(S3Client::class);
        $command = $this->createStub(CommandInterface::class);

        $s3Client->expects($this->once())
            ->method('getCommand')
            ->with(
                'GetObject',
                $this->callback(
                    function (array $params) {
                        $this->assertSame('test-bucket', $params['Bucket']);
                        $this->assertSame('custom-prefix/image-6789.png', $params['Key']);
                        $this->assertStringStartsWith('inline;', $params['ResponseContentDisposition']);
                        $this->assertStringContainsString('Diagram.png', $params['ResponseContentDisposition']);
                        $this->assertSame('image/png', $params['ResponseContentType']);

                        return true;
                    }
                )
            )
            ->willReturn($command);

        $s3Client->expects($this->once())
            ->method('createPresignedRequest')
            ->with($command, '+15 minutes')
            ->willReturn(
                new Request(
                    'GET',
                    'https://s3.example.com/test-bucket/custom-prefix/image-6789.png?X-Amz-Signature=xyz'
                )
            );

        $generator = new PresignedUrlGenerator($s3Client, 'test-bucket', 'custom-prefix', 15);
        $document = $this->createDocument('Diagram', 'image-6789.png');

        $url = $generator->generateUrl($document, true);

        $this->assertSame(
            'https://s3.example.com/test-bucket/custom-prefix/image-6789.png?X-Amz-Signature=xyz',
            $url
        );
    }

    public function testGenerateUrlWorksWithRealS3ClientSigV4(): void
    {
        // Real S3Client signs requests completely in-memory without contacting AWS
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
        $document = $this->createDocument('Algoritmen & Datastructuren - Samenvatting', 'algo-notes-abc123.pdf');

        $url = $generator->generateUrl($document, true);

        $this->assertStringStartsWith(
            'https://s3.leuven.vtk.be/burgieclan-bucket/documents/algo-notes-abc123.pdf?',
            $url
        );
        $this->assertStringContainsString('X-Amz-Algorithm=AWS4-HMAC-SHA256', $url);
        $this->assertStringContainsString('X-Amz-Credential=TEST_KEY', $url);
        $this->assertStringContainsString('X-Amz-Expires=600', $url);
        $this->assertStringContainsString('X-Amz-Signature=', $url);
        $this->assertStringContainsString('response-content-disposition=', $url);
        $this->assertStringContainsString('response-content-type=application%2Fpdf', $url);
    }
}
