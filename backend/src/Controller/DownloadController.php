<?php

namespace App\Controller;

use App\Constants\PreviewableFile;
use App\Repository\DocumentRepository;
use App\Service\PresignedUrlGenerator;
use App\Utils\DownloadFilename;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Vich\UploaderBundle\Exception\NoFileFoundException;
use Vich\UploaderBundle\Handler\DownloadHandler;

#[Route('/files/download')]
final class DownloadController extends AbstractController
{
    public function __construct(
        private readonly DocumentRepository $documentRepository,
        private readonly DownloadHandler $downloadHandler,
        private readonly PresignedUrlGenerator $presignedUrlGenerator,
    ) {
    }

    #[Route('/{filename}', name: 'document_download', methods: ['GET'])]
    public function __invoke(
        string $filename,
        Request $request,
    ): Response {
        $document = $this->documentRepository->findOneBy(['file_name' => $filename]);

        // If the document record doesn't exist, return 404 early.
        if (null === $document) {
            return new Response('File not found', Response::HTTP_NOT_FOUND);
        }

        $isInline = (bool) $request->query->get('inline');

        // When S3 is active (production), redirect to a time-limited pre-signed S3 URL.
        // This offloads the file transfer from PHP workers entirely.
        if ($this->presignedUrlGenerator->isEnabled()) {
            $presignedUrl = $this->presignedUrlGenerator->generateUrl($document, $isInline);
            $response = new RedirectResponse($presignedUrl, Response::HTTP_FOUND);
            $response->headers->set('Cache-Control', 'private, no-cache');

            return $response;
        }

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

            // When ?inline=1 is set, serve for in-browser viewing instead of download
            if ($isInline) {
                $response->headers->set('Content-Disposition', 'inline');
                // Correct the MIME type, which VichUploader falls back to
                // application/octet-stream for when the entity has no mimeType field.
                $contentType = PreviewableFile::contentTypeFor($filename);
                if (null !== $contentType) {
                    $response->headers->set('Content-Type', $contentType);
                }
            }

            return $response;
        } catch (NoFileFoundException $e) {
            // Vich signals missing file via its own exception in some code paths
            return new Response('File not found', Response::HTTP_NOT_FOUND);
        }
    }
}
