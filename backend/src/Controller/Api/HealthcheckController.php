<?php

namespace App\Controller\Api;

use Doctrine\DBAL\Exception;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class HealthcheckController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    public function __invoke(): JsonResponse
    {
        try {
            // Test database connection with a simple query
            $connection = $this->entityManager->getConnection();
            $connection->executeQuery('SELECT 1');

            return new JsonResponse(
                [
                'status' => 'ok',
                'timestamp' => date('c'),
                'service' => 'burgieclan-api',
                'database' => 'connected'
                ],
                Response::HTTP_OK
            );
        } catch (Exception $e) {
            return new JsonResponse(
                [
                'status' => 'error',
                'timestamp' => date('c'),
                'service' => 'burgieclan-api',
                'database' => 'disconnected',
                'error' => $e->getMessage()
                ],
                Response::HTTP_SERVICE_UNAVAILABLE
            );
        }
    }
}
