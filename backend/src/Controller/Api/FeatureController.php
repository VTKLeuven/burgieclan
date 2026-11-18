<?php

namespace App\Controller\Api;

use App\Service\Feature\FeatureFlags;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Which features are switched on, e.g. {"exam_reconstructions": false}. Public, because the
 * frontend reads it while rendering any page, logged in or not.
 */
class FeatureController extends AbstractController
{
    #[Route('/api/features', name: 'api_features', methods: ['GET'])]
    public function __invoke(FeatureFlags $flags): JsonResponse
    {
        return new JsonResponse($flags->all());
    }
}
