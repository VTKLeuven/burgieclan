<?php

namespace App\Controller\Api;

use App\Repository\DocumentRepository;
use App\Security\Voter\DocumentFileVoter;
use App\Service\DocumentFileUrlGenerator;
use League\Flysystem\FilesystemException;
use League\Flysystem\FilesystemOperator;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Returns a short-lived link to a document's file, for the PDF viewer and the download button.
 *
 *     GET /api/documents/{id}/file-url            -> {"url": "..."} (download)
 *     GET /api/documents/{id}/file-url?inline=1   -> {"url": "..."} (in-browser preview)
 *
 * The link needs no cookie, so JavaScript can fetch it from the bucket directly. It is
 * either absolute (S3) or relative to the backend (local storage); see
 * DocumentFileUrlGenerator.
 */
final class DocumentFileUrlController extends AbstractController
{
    public function __construct(
        private readonly DocumentRepository $documentRepository,
        private readonly DocumentFileUrlGenerator $fileUrlGenerator,
        #[Autowire(service: 'default.storage')]
        private readonly FilesystemOperator $documentStorage,
    ) {
    }

    #[Route(
        '/api/documents/{id}/file-url',
        name: 'api_document_file_url',
        requirements: ['id' => '\d+'],
        methods: ['GET']
    )]
    public function __invoke(int $id, Request $request): JsonResponse
    {
        $document = $this->documentRepository->find($id);
        $filename = $document?->getFileName();

        // Documents the user may not see answer exactly like missing ones.
        if (null === $document || null === $filename || !$this->isGranted(DocumentFileVoter::VIEW_FILE, $document)) {
            return $this->notFound();
        }

        // Checked here because the signed link cannot report a missing file gracefully: the
        // browser would land on the storage's own error page instead of a toast.
        try {
            if (!$this->documentStorage->fileExists($filename)) {
                return $this->notFound();
            }
        } catch (FilesystemException) {
            return $this->notFound();
        }

        $url = $this->fileUrlGenerator->generate($document, (bool) $request->query->get('inline'));
        $response = new JsonResponse(['url' => $url]);
        // Every response is a fresh credential; nothing may keep or share it.
        $response->headers->set('Cache-Control', 'no-store, private');

        return $response;
    }

    private function notFound(): JsonResponse
    {
        return new JsonResponse(['title' => 'Not Found', 'detail' => 'File not found'], JsonResponse::HTTP_NOT_FOUND);
    }
}
