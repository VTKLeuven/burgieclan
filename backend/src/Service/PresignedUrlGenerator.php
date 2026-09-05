<?php

namespace App\Service;

use App\Constants\PreviewableFile;
use App\Entity\Document;
use App\Utils\DownloadFilename;
use Aws\S3\S3Client;
use LogicException;
use Symfony\Component\HttpFoundation\HeaderUtils;

class PresignedUrlGenerator
{
    public function __construct(
        private readonly ?S3Client $s3Client = null,
        private readonly ?string $bucket = null,
        private readonly string $prefix = 'documents',
        private readonly int $ttlMinutes = 10,
    ) {
    }

    public function isEnabled(): bool
    {
        return null !== $this->s3Client && null !== $this->bucket && '' !== $this->bucket;
    }

    public function generateUrl(Document $document, bool $inline = false): string
    {
        if (!$this->isEnabled() || null === $this->s3Client || null === $this->bucket) {
            throw new LogicException('PresignedUrlGenerator is not enabled or S3 is not configured.');
        }

        $filename = (string) $document->getFileName();
        $prefix = trim($this->prefix, '/');
        $key = ('' !== $prefix ? $prefix . '/' : '') . $filename;

        $displayName = DownloadFilename::forDocument($document);
        $fallback = preg_replace('/[^A-Za-z0-9._-]/', '_', $displayName) ?: 'document';

        $dispositionType = $inline ? HeaderUtils::DISPOSITION_INLINE : HeaderUtils::DISPOSITION_ATTACHMENT;
        $contentDisposition = HeaderUtils::makeDisposition($dispositionType, $displayName, $fallback);

        $params = [
            'Bucket' => $this->bucket,
            'Key' => $key,
            'ResponseContentDisposition' => $contentDisposition,
        ];

        if ($inline) {
            $contentType = PreviewableFile::contentTypeFor($filename);
            if (null !== $contentType) {
                $params['ResponseContentType'] = $contentType;
            }
        }

        $command = $this->s3Client->getCommand('GetObject', $params);
        $presignedRequest = $this->s3Client->createPresignedRequest($command, "+{$this->ttlMinutes} minutes");

        return (string) $presignedRequest->getUri();
    }
}
