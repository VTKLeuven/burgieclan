<?php

namespace App\Controller\Api;

use App\Entity\CollabDocument;
use App\Entity\User;
use App\Security\Voter\CollabDocumentVoter;
use App\Service\Collab\CollabTokenIssuer;
use DateTimeInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Hands out the token a browser needs to open a live document on the collab server.
 *
 * Body: {"document": "<name>"}. Answers {"token", "mode", "expiresAt"}, where mode is "edit" or
 * "view". The frontend calls this again on every websocket (re)connect.
 */
#[IsGranted(User::ROLE_USER)]
class CollabTokenController extends AbstractController
{
    #[Route('/api/collab/token', name: 'api_collab_token', methods: ['POST'])]
    public function __invoke(Request $request, CollabTokenIssuer $issuer): JsonResponse
    {
        $payload = json_decode($request->getContent(), true);
        $document = is_array($payload) ? ($payload['document'] ?? null) : null;

        if (!is_string($document) || !CollabDocument::isValidName($document)) {
            return new JsonResponse(
                ['detail' => 'Expected {"document": "<name>"} with a valid document name.'],
                Response::HTTP_BAD_REQUEST
            );
        }

        if ($this->isGranted(CollabDocumentVoter::EDIT, $document)) {
            $mode = CollabTokenIssuer::MODE_EDIT;
        } elseif ($this->isGranted(CollabDocumentVoter::VIEW, $document)) {
            $mode = CollabTokenIssuer::MODE_VIEW;
        } else {
            throw $this->createAccessDeniedException();
        }

        if (!$issuer->isConfigured()) {
            return new JsonResponse(
                ['detail' => 'Live editing is not available right now.'],
                Response::HTTP_SERVICE_UNAVAILABLE
            );
        }

        $user = $this->getUser();
        assert($user instanceof User);

        $issued = $issuer->issue($user, $document, $mode);

        $body = [
            'token' => $issued['token'],
            'mode' => $mode,
            'expiresAt' => $issued['expiresAt']->format(DateTimeInterface::ATOM),
        ];

        return new JsonResponse($body);
    }
}
