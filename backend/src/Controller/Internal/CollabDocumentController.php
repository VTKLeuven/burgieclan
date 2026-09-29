<?php

namespace App\Controller\Internal;

use App\Entity\CollabDocument;
use App\Repository\CollabDocumentRepository;
use App\Service\Collab\CollabRequestSignature;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Load and store routes for the collab server (Hocuspocus, see collab/src/backend.ts).
 *
 * Only the collab server calls these, server to server, and every request must carry a valid
 * CollabRequestSignature. They sit outside /api on purpose: no JWT firewall, no API Platform, and
 * the public nginx does not forward /internal to Symfony at all.
 */
#[Route(
    '/internal/collab/documents/{name}',
    requirements: ['name' => '[a-z0-9][a-z0-9-]{0,99}']
)]
final class CollabDocumentController extends AbstractController
{
    /**
     * Upper bound on a stored document. An exam reconstruction is a few KB; this only stops a
     * runaway or malicious client from filling the database.
     */
    public const MAX_STATE_BYTES = 5 * 1024 * 1024;

    public function __construct(
        private readonly CollabRequestSignature $signature,
        private readonly CollabDocumentRepository $repository,
        private readonly EntityManagerInterface $entityManager,
    ) {}

    /**
     * Returns the stored Yjs state, or 404 when the document has never been stored. The collab
     * server then starts from an empty document.
     */
    #[Route('', name: 'internal_collab_document_load', methods: ['GET'])]
    public function load(string $name, Request $request): Response
    {
        if (!$this->signature->isValid($request)) {
            return new Response(null, Response::HTTP_UNAUTHORIZED);
        }

        $document = $this->repository->findOneByName($name);
        if (null === $document) {
            return new Response(null, Response::HTTP_NOT_FOUND);
        }

        return new Response(
            $document->getState(),
            Response::HTTP_OK,
            ['Content-Type' => 'application/octet-stream']
        );
    }

    /**
     * Stores the document. Body: {"state": "<base64 Yjs update>", "content": <TipTap JSON>|null}.
     */
    #[Route('', name: 'internal_collab_document_store', methods: ['PUT'])]
    public function store(string $name, Request $request): Response
    {
        if (!$this->signature->isValid($request)) {
            return new Response(null, Response::HTTP_UNAUTHORIZED);
        }

        // base64 grows the state by a third; leave room for the JSON copy next to it.
        if (strlen($request->getContent()) > self::MAX_STATE_BYTES * 3) {
            return new Response(null, Response::HTTP_REQUEST_ENTITY_TOO_LARGE);
        }

        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload) || !is_string($payload['state'] ?? null)) {
            return new JsonResponse(['detail' => 'Expected {"state": "<base64>", "content": ...}.'], 400);
        }

        $state = base64_decode($payload['state'], true);
        if (false === $state || '' === $state) {
            return new JsonResponse(['detail' => 'state is not valid base64.'], 400);
        }

        if (strlen($state) > self::MAX_STATE_BYTES) {
            return new Response(null, Response::HTTP_REQUEST_ENTITY_TOO_LARGE);
        }

        $content = $payload['content'] ?? null;
        if (null !== $content && !is_array($content)) {
            return new JsonResponse(['detail' => 'content must be an object or null.'], 400);
        }

        $document = $this->repository->findOneByName($name);
        if (null === $document) {
            $document = new CollabDocument($name, $state);
            $this->entityManager->persist($document);
        } else {
            $document->setState($state);
        }
        $document->setContent($content);

        $this->entityManager->flush();

        return new Response(null, Response::HTTP_NO_CONTENT);
    }
}
