<?php

namespace App\Controller\Admin;

use App\Repository\DocumentRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
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
            // Force inline rendering — override whatever VichUploader set
            $response->headers->set('Content-Disposition', 'inline');
            // Ensure correct MIME type for PDFs (VichUploader may fall back
            // to application/octet-stream when the entity has no mimeType field)
            if (str_ends_with(strtolower($filename), '.pdf')) {
                $response->headers->set('Content-Type', 'application/pdf');
            }

            return $response;
        } catch (NoFileFoundException $e) {
            return new Response('File not found', Response::HTTP_NOT_FOUND);
        }
    }
}
