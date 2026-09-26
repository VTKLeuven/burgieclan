<?php

namespace App\Controller;

use App\Constants\PreviewableFile;
use App\Entity\Document;
use App\Repository\DocumentRepository;
use App\Security\Voter\DocumentFileVoter;
use App\Service\PresignedUrlGenerator;
use App\Utils\DownloadFilename;
use League\Flysystem\FilesystemException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\UriSigner;
use Symfony\Component\Routing\Attribute\Route;
use Vich\UploaderBundle\Exception\NoFileFoundException;
use Vich\UploaderBundle\Handler\DownloadHandler;

/**
 * Serves document files.
 *
 * Two entry points lead to the same file:
 *
 *  - /files/download/{filename}: authenticated with the login cookie (or a bearer token).
 *    Used where the browser itself loads the file: <img> previews and "open in a new tab".
 *  - /files/signed/{filename}: authorised by a signed, expiring query string handed out by
 *    DocumentFileUrlController. Used by JavaScript, which loads files without the cookie.
 *    Only issued while documents are stored locally; on S3 the signed link points at the
 *    bucket instead.
 */
final class DownloadController extends AbstractController
{
    public function __construct(
        private readonly DocumentRepository $documentRepository,
        private readonly DownloadHandler $downloadHandler,
        private readonly PresignedUrlGenerator $presignedUrlGenerator,
        private readonly UriSigner $uriSigner,
    ) {
    }

    #[Route('/files/download/{filename}', name: 'document_download', methods: ['GET'])]
    public function download(string $filename, Request $request): Response
    {
        $document = $this->documentRepository->findOneBy(['file_name' => $filename]);

        // Documents the user may not see answer exactly like missing ones.
        if (null === $document || !$this->isGranted(DocumentFileVoter::VIEW_FILE, $document)) {
            return new Response('File not found', Response::HTTP_NOT_FOUND);
        }

        $isInline = (bool) $request->query->get('inline');

        // When documents live on S3, redirect to a time-limited pre-signed URL.
        // This offloads the file transfer from PHP workers entirely.
        if ($this->presignedUrlGenerator->isEnabled()) {
            $presignedUrl = $this->presignedUrlGenerator->generateUrl($document, $isInline);
            $response = new RedirectResponse($presignedUrl, Response::HTTP_FOUND);
            $response->headers->set('Cache-Control', 'private, no-cache');

            return $response;
        }

        return $this->serve($document, $isInline);
    }

    #[Route('/files/signed/{filename}', name: 'document_signed_download', methods: ['GET'])]
    public function signedDownload(string $filename, Request $request): Response
    {
        // The signature covers the path and query and carries its own expiry, so it stands
        // in for the access check DocumentFileUrlController did before signing.
        if (!$this->uriSigner->check($request->getRequestUri())) {
            return new Response('Link expired or invalid', Response::HTTP_FORBIDDEN);
        }

        $document = $this->documentRepository->findOneBy(['file_name' => $filename]);
        if (null === $document) {
            return new Response('File not found', Response::HTTP_NOT_FOUND);
        }

        return $this->serve($document, (bool) $request->query->get('inline'));
    }

    private function serve(Document $document, bool $isInline): Response
    {
        try {
            $response = $this->downloadHandler->downloadObject(
                $document,
                'file',
                null,
                // Serve under the document's own name instead of the storage name,
                // which carries the uniqid the SmartUniqueNamer appended on upload.
                DownloadFilename::forDocument($document),
                !$isInline
            );
        } catch (NoFileFoundException | FilesystemException) {
            return new Response('File not found', Response::HTTP_NOT_FOUND);
        }

        // When ?inline=1 is set, serve for in-browser viewing instead of download
        if ($isInline) {
            $response->headers->set('Content-Disposition', 'inline');
            // Correct the MIME type, which VichUploader falls back to
            // application/octet-stream for when the entity has no mimeType field.
            $contentType = PreviewableFile::contentTypeFor((string) $document->getFileName());
            if (null !== $contentType) {
                $response->headers->set('Content-Type', $contentType);
            }
        }

        return $response;
    }
}
