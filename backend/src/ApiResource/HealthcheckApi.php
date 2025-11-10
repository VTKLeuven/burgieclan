<?php

namespace App\ApiResource;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\OpenApi\Model\Operation;
use ApiPlatform\OpenApi\Model\Response;
use ArrayObject;
use App\Controller\Api\HealthcheckController;

#[ApiResource(
    shortName: 'Healthcheck',
    operations: [
        new Get(
            uriTemplate: 'healthcheck',
            controller: HealthcheckController::class,
            read: false,
            name: 'api_healthcheck',
            openapi: new Operation(
                tags: ['Health'],
                responses: [
                    '200' => new Response(
                        description: 'Service is healthy',
                        content: new ArrayObject([
                            'application/json' => [
                                'example' => [
                                    'status' => 'ok',
                                    'timestamp' => '2025-11-08T12:00:00+00:00',
                                    'service' => 'burgieclan-api',
                                    'database' => 'connected'
                                ]
                            ]
                        ])
                    ),
                    '503' => new Response(
                        description: 'Service is unhealthy',
                        content: new ArrayObject([
                            'application/json' => [
                                'example' => [
                                    'status' => 'error',
                                    'timestamp' => '2025-11-08T12:00:00+00:00',
                                    'service' => 'burgieclan-api',
                                    'database' => 'disconnected',
                                    'error' => 'Database connection failed'
                                ]
                            ]
                        ])
                    )
                ],
                summary: 'Health check endpoint',
                description: 'Checks if the service and database are healthy'
            ),
        )
    ]
)]
class HealthcheckApi
{
}
