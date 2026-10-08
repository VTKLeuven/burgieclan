<?php

namespace App\Service;

use App\Constants\PreviewableFile;
use App\Entity\Document;
use App\Utils\DownloadFilename;
use Aws\S3\S3Client;
use LogicException;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\HeaderUtils;

class PresignedUrlGenerator
{
    public function __construct(
        #[Autowire(service: 's3_public_client')]
        private readonly ?S3Client $s3Client = null,
        #[Autowire(env: 'S3_BUCKET')]
        private readonly ?string $bucket = null,
        private readonly string $prefix = 'documents',
        private readonly int $ttlMinutes = DocumentFileUrlGenerator::TTL_MINUTES,
        // The DOCUMENT_STORAGE value: pre-signed URLs only make sense when documents live on S3.
        #[Autowire(env: 'DOCUMENT_STORAGE')]
        private readonly string $documentStorage = 's3',
    ) {
    }

    public function isEnabled(): bool
    {
        return 's3' === $this->documentStorage
            && null !== $this->s3Client
            && null !== $this->bucket
            && '' !== $this->bucket;
    }

    public function generateUrl(Document $document, bool $inline = false): string
    {
        $filename = (string) $document->getFileName();
        $prefix = trim($this->prefix, '/');
        $key = ('' !== $prefix ? $prefix . '/' : '') . $filename;

        return $this->generateForKey(
            $key,
            DownloadFilename::forDocument($document),
            $inline,
            $inline ? PreviewableFile::contentTypeFor($filename) : null,
        );
    }

    /**
     * Signs a download of any object in the bucket, saved under $displayName.
     *
     * @param string $key The full object key, prefix included (e.g. "exports/abc.zip")
     */
    public function generateForKey(
        string $key,
        string $displayName,
        bool $inline = false,
        ?string $contentType = null,
    ): string {
        if (!$this->isEnabled() || null === $this->s3Client || null === $this->bucket) {
            throw new LogicException('PresignedUrlGenerator is not enabled or S3 is not configured.');
        }

        $fallback = preg_replace('/[^A-Za-z0-9._-]/', '_', $displayName) ?: 'document';

        $dispositionType = $inline ? HeaderUtils::DISPOSITION_INLINE : HeaderUtils::DISPOSITION_ATTACHMENT;
        $contentDisposition = HeaderUtils::makeDisposition($dispositionType, $displayName, $fallback);

        $params = [
            'Bucket' => $this->bucket,
            'Key' => $key,
            'ResponseContentDisposition' => $contentDisposition,
        ];

        if (null !== $contentType) {
            $params['ResponseContentType'] = $contentType;
        }

        $command = $this->s3Client->getCommand('GetObject', $params);
        $presignedRequest = $this->s3Client->createPresignedRequest($command, "+{$this->ttlMinutes} minutes");

        return (string) $presignedRequest->getUri();
    }
}
