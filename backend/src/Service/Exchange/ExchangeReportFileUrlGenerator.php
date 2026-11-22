<?php

namespace App\Service\Exchange;

use App\Entity\ExchangeReportFile;
use App\Service\DocumentFileUrlGenerator;
use App\Service\PresignedUrlGenerator;
use DateInterval;
use Symfony\Component\HttpFoundation\UriSigner;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;

/**
 * Short-lived links to the files of exchange reports, like DocumentFileUrlGenerator's: a
 * pre-signed bucket URL on S3, a signed URL to /files/exchange/... (ExchangeReportFileController)
 * on local storage. Whoever asks has already been checked; the link is its own authorisation.
 */
class ExchangeReportFileUrlGenerator
{
    /** Where the files sit in the bucket (exchange_files.s3 in flysystem.yaml). */
    public const BUCKET_PREFIX = 'exchange-files/';

    public function __construct(
        private readonly PresignedUrlGenerator $presignedUrlGenerator,
        private readonly UriSigner $uriSigner,
        private readonly UrlGeneratorInterface $urlGenerator,
    ) {}

    public function generate(ExchangeReportFile $file): string
    {
        if ($this->presignedUrlGenerator->isEnabled()) {
            return $this->presignedUrlGenerator->generateForKey(
                self::BUCKET_PREFIX . $file->getFileName(),
                $file->getOriginalName(),
                inline: ExchangeReportFileStore::isInline($file),
                contentType: ExchangeReportFileStore::contentType($file),
            );
        }

        return $this->uriSigner->sign(
            $this->urlGenerator->generate('exchange_report_file_signed', ['fileName' => $file->getFileName()]),
            new DateInterval(sprintf('PT%dM', DocumentFileUrlGenerator::TTL_MINUTES))
        );
    }
}
