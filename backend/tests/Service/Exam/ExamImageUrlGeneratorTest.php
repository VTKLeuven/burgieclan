<?php

namespace App\Tests\Service\Exam;

use App\Entity\Exam;
use App\Entity\ExamImage;
use App\Service\Exam\ExamImageUrlGenerator;
use App\Service\PresignedUrlGenerator;
use Aws\S3\S3Client;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\UriSigner;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;

/**
 * The S3 side of the image links, which the functional tests (local storage) never reach.
 * Signing needs no network, so a real client signs here.
 */
class ExamImageUrlGeneratorTest extends TestCase
{
    public function testOnS3AnImageGetsAPreSignedLinkToItsObjectShownInline(): void
    {
        $config = [
            'version' => 'latest',
            'region' => 'us-east-1',
            'endpoint' => 'https://bucket.example',
            'use_path_style_endpoint' => true,
            'credentials' => ['key' => 'key', 'secret' => 'secret'],
        ];
        $client = new S3Client($config);
        $generator = new ExamImageUrlGenerator(
            new PresignedUrlGenerator($client, 'burgieclan', documentStorage: 's3'),
            new UriSigner('secret'),
            $this->createStub(UrlGeneratorInterface::class),
        );
        $image = new ExamImage($this->createStub(Exam::class), null, 'image/webp', 'webp', 1, 1, 1);

        $url = $generator->generate($image);
        parse_str((string) parse_url($url, PHP_URL_QUERY), $query);

        $this->assertStringStartsWith('https://bucket.example/burgieclan/exam-images/' . $image->getFileName() . '?', $url);
        $this->assertSame('image/webp', $query['response-content-type']);
        $this->assertStringStartsWith('inline', (string) $query['response-content-disposition']);
        $this->assertSame((string) (ExamImageUrlGenerator::TTL_MINUTES * 60), $query['X-Amz-Expires']);
    }
}
