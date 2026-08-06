<?php

namespace App\ApiResource;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\OpenApi\Model\Operation;
use ApiPlatform\OpenApi\Model\Parameter;
use ApiPlatform\OpenApi\Model\Response;
use App\Controller\Api\FluxusOAuthInitiateController;

#[ApiResource(
    shortName: 'Fluxus OAuth',
    operations: [
        new Get(
            uriTemplate: '/auth/oauth/initiate',
            controller: FluxusOAuthInitiateController::class,
            openapi: new Operation(
                responses: [
                    '302' => new Response(
                        description: 'Redirect to OAuth provider',
                        content: null,
                        headers: new \ArrayObject(
                            [
                                'Location' => [
                                    'description' => 'OAuth provider authorization URL',
                                    'schema' => [
                                        'type' => 'string'
                                    ]
                                ]
                            ]
                        )
                    )
                ],
                summary: 'Initiate OAuth flow with Fluxus',
                description: 'Redirects user to the VTK authorization server for authentication',
                parameters: [
                    new Parameter(
                        name: 'redirect_to',
                        in: 'query',
                        description: 'Frontend URL to redirect to after successful authentication',
                        required: false,
                        schema: [
                            'type' => 'string',
                            'example' => '/'
                        ]
                    )
                ]
            ),
            read: false,
            deserialize: false,
            validate: false,
            write: false,
            serialize: false,
            name: 'api_oauth_initiate'
        ),
    ]
)]
class FluxusOAuthInitiateApi
{
}
