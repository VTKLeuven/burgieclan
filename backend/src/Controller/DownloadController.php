<?php

namespace App\Controller;

use App\Repository\DocumentRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
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
        return $downloadHandler->downloadObject(
            $document,
            'file',
            null,
            null,
            false
        );
    }
}
