<?php

namespace App\ApiResource;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\OpenApi\Model\Operation;
use ApiPlatform\OpenApi\Model\Parameter;
use ApiPlatform\OpenApi\Model\Response;
use App\Controller\Api\FluxusOAuthCallbackController;

#[ApiResource(
    shortName: 'Fluxus OAuth',
    operations: [
        new Get(
            uriTemplate: '/auth/oauth/callback',
            controller: FluxusOAuthCallbackController::class,
            openapi: new Operation(
                responses: [
                    '302' => new Response(
                        description: 'Redirect to frontend with authentication tokens',
                        content: null,
                        headers: new \ArrayObject(
                            [
                                'Location' => [
                                    'description' => 'Frontend callback URL with JWT tokens and redirect parameters',
                                    'schema' => [
                                        'type' => 'string',
                                        'example' => 'http://localhost:3002/auth/callback?token=jwt&refresh_token=x'
                                    ]
                                ]
                            ]
                        )
                    ),
                    '400' => new Response(
                        description: 'Invalid OAuth state or missing authorization code',
                        content: null,
                        headers: new \ArrayObject(
                            [
                                'Location' => [
                                    'description' => 'Frontend callback URL with error parameter',
                                    'schema' => [
                                        'type' => 'string',
                                        'example' => 'http://localhost:3002/auth/callback?error=invalid_state'
                                    ]
                                ]
                            ]
                        )
                    )
                ],
                summary: 'OAuth callback from Fluxus',
                description: 'Handles the OAuth callback from the VTK authorization server and redirects to ' .
                    'the frontend with JWT tokens',
                parameters: [
                    new Parameter(
                        name: 'code',
                        in: 'query',
                        description: 'Authorization code from OAuth provider',
                        required: true,
                        schema: [
                            'type' => 'string',
                            'example' => 'abc123xyz789'
                        ]
                    ),
                    new Parameter(
                        name: 'state',
                        in: 'query',
                        description: 'OAuth state parameter for security validation',
                        required: true,
                        schema: [
                            'type' => 'string',
                            'example' => 'random_state_string'
                        ]
                    ),
                    new Parameter(
                        name: 'error',
                        in: 'query',
                        description: 'Error code if OAuth authorization failed',
                        required: false,
                        schema: [
                            'type' => 'string',
                            'example' => 'access_denied'
                        ]
                    )
                ]
            ),
            read: false,
            deserialize: false,
            validate: false,
            write: false,
            serialize: false,
            name: 'api_oauth_callback'
        ),
    ]
)]
class FluxusOAuthCallbackApi
{
}
