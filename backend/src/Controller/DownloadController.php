<?php

namespace App\Controller;

use App\Constants\PreviewableFile;
use App\Repository\DocumentRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Vich\UploaderBundle\Exception\NoFileFoundException;
use Vich\UploaderBundle\Handler\DownloadHandler;

#[Route('/files/download')]
final class DownloadController extends AbstractController
{
    #[Route('/{filename}', name: 'document_download', methods: ['GET'])]
    public function __invoke(
        string $filename,
        Request $request,
        DocumentRepository $documentRepository,
        DownloadHandler $downloadHandler
    ): Response {
        $document = $documentRepository->findOneBy(['file_name' => $filename]);

        // If the document record doesn't exist, return 404 early.
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

            // When ?inline=1 is set, serve for in-browser viewing instead of download
            if ($request->query->get('inline')) {
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
