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
        Request            $request,
        string             $filename,
        DocumentRepository $documentRepository,
        DownloadHandler    $downloadHandler
    ): Response {
        $document = $documentRepository->findOneBy(['file_name' => $filename]);

        // If the document record doesn't exist, return 404 early.
        if (null === $document) {
            return new Response('File not found', Response::HTTP_NOT_FOUND);
        }

        try {
            return $downloadHandler->downloadObject(
                $document,
                'file',
                null,
                null,
                false
            );
        } catch (NoFileFoundException $e) {
            // Vich signals missing file via its own exception in some code paths
            return new Response('File not found', Response::HTTP_NOT_FOUND);
        }
    }
}
