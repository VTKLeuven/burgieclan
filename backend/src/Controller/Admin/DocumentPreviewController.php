<?php

namespace App\Controller\Admin;

use App\Constants\PreviewableFile;
use App\Repository\DocumentRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\HeaderUtils;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Vich\UploaderBundle\Exception\NoFileFoundException;
use Vich\UploaderBundle\Handler\DownloadHandler;

/**
 * Serves document files inline for the EasyAdmin preview iframe.
 * This route lives under /admin so it uses the main (session-based) firewall,
 * unlike /files/download which requires JWT authentication.
 */
#[Route('/admin/document-preview')]
final class DocumentPreviewController extends AbstractController
{
    #[Route('/{filename}', name: 'admin_document_preview', methods: ['GET'])]
    public function __invoke(
        string $filename,
        DocumentRepository $documentRepository,
        DownloadHandler $downloadHandler
    ): Response {
        $this->denyAccessUnlessGranted('ROLE_MODERATOR');

        $document = $documentRepository->findOneBy(['file_name' => $filename]);

        if (null === $document) {
            return new Response('File not found', Response::HTTP_NOT_FOUND);
        }

        try {
            $response = $downloadHandler->downloadObject(
                $document,
                'file',
                null,
                null,
                false
            );
            // Allow this response to be framed by the admin panel (same origin)
            $response->headers->set('X-Frame-Options', 'SAMEORIGIN');

            // Correct the MIME type, which VichUploader falls back to
            // application/octet-stream for when the entity has no mimeType field.
            $contentType = PreviewableFile::contentTypeFor($filename);

            if (null !== $contentType) {
                $response->headers->set('Content-Type', $contentType);
                $response->headers->set('Content-Disposition', HeaderUtils::DISPOSITION_INLINE);

                return $response;
            }

            // Nothing we can draw. Saying "inline" anyway used to produce a response that
            // contradicted itself - application/octet-stream, inline, and nosniff - which
            // browsers resolve by downloading a file with no usable name. Ask for the
            // download explicitly instead, and name it.
            // The fallback is for clients that cannot read filename*; it has to be plain
            // ASCII with no path separators. Stored names are already slugified, so this
            // normally leaves them untouched.
            $fallback = preg_replace('/[^A-Za-z0-9._-]/', '_', $filename) ?: 'document';
            $response->headers->set(
                'Content-Disposition',
                HeaderUtils::makeDisposition(HeaderUtils::DISPOSITION_ATTACHMENT, $filename, $fallback)
            );

            return $response;
        } catch (NoFileFoundException $e) {
            return new Response('File not found', Response::HTTP_NOT_FOUND);
        }
    }
}
