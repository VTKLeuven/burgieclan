<?php

namespace App\Service;

use App\Constants\ZipExport;
use App\Entity\Document;
use Symfony\Component\HttpFoundation\UriSigner;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;

/**
 * Hands out short-lived links to a document's file that work without the login cookie.
 *
 * The frontend loads files from JavaScript (the PDF viewer, the download button). Those
 * requests cannot carry the login cookie to S3: the bucket would have to answer with
 * `Access-Control-Allow-Credentials`, which not every S3 implementation does. So the
 * backend checks access once and gives out a link that is its own authorisation:
 *
 *  - documents on S3: a pre-signed bucket URL (absolute, see PresignedUrlGenerator);
 *  - documents on local disk: a signed URL to /files/signed/..., relative to the backend.
 *
 * Both expire after the same number of minutes, so the frontend treats them alike.
 */
class DocumentFileUrlGenerator
{
    public const TTL_MINUTES = 10;

    public function __construct(
        private readonly PresignedUrlGenerator $presignedUrlGenerator,
        private readonly UriSigner $uriSigner,
        private readonly UrlGeneratorInterface $urlGenerator,
    ) {
    }

    public function generate(Document $document, bool $inline = false): string
    {
        if ($this->presignedUrlGenerator->isEnabled()) {
            return $this->presignedUrlGenerator->generateUrl($document, $inline);
        }

        $path = $this->urlGenerator->generate(
            'document_signed_download',
            array_filter(['filename' => $document->getFileName(), 'inline' => $inline ? 1 : null]),
        );

        return $this->sign($path);
    }

    /**
     * A link to a generated zip in the exports storage, saved as $displayName.
     *
     * @param string $exportName The zip's name inside the exports storage, e.g. "<hash>.zip"
     */
    public function generateForExport(string $exportName, string $displayName): string
    {
        if ($this->presignedUrlGenerator->isEnabled()) {
            return $this->presignedUrlGenerator->generateForKey(
                ZipExport::BUCKET_PREFIX . $exportName,
                $displayName,
                contentType: 'application/zip',
            );
        }

        return $this->sign(
            $this->urlGenerator->generate(
                'export_signed_download',
                ['name' => $exportName, 'filename' => $displayName],
            )
        );
    }

    private function sign(string $path): string
    {
        return $this->uriSigner->sign($path, new \DateInterval(sprintf('PT%dM', self::TTL_MINUTES)));
    }
}
