<?php

namespace App\Controller;

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
                $lowerName = strtolower($filename);
                if (str_ends_with($lowerName, '.pdf')) {
                    $response->headers->set('Content-Type', 'application/pdf');
                } elseif (str_ends_with($lowerName, '.png')) {
                    $response->headers->set('Content-Type', 'image/png');
                } elseif (str_ends_with($lowerName, '.jpg') || str_ends_with($lowerName, '.jpeg')) {
                    $response->headers->set('Content-Type', 'image/jpeg');
                } elseif (str_ends_with($lowerName, '.gif')) {
                    $response->headers->set('Content-Type', 'image/gif');
                } elseif (str_ends_with($lowerName, '.webp')) {
                    $response->headers->set('Content-Type', 'image/webp');
                }
            }

            return $response;
        } catch (NoFileFoundException $e) {
            // Vich signals missing file via its own exception in some code paths
            return new Response('File not found', Response::HTTP_NOT_FOUND);
        }
    }
}
