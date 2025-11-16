<?php

namespace App\ApiResource;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Post;
use ApiPlatform\OpenApi\Model\Operation;
use ApiPlatform\OpenApi\Model\RequestBody;
use ApiPlatform\OpenApi\Model\Response;
use ArrayObject;

# This route has no explicit controller because the logic is handled by the JWT and refresh token system.
# The route is protected to ensure only authenticated users can access it.
# The refresh token to invalidate is expected in the request body.
# The jwt and refresh token management is handled by LexikJWTAuthenticationBundle and GesdinetJWTRefreshTokenBundle.
#[ApiResource(
    shortName: 'Logout',
    operations: [
        new Post(
            uriTemplate: '/auth/logout',
            openapi: new Operation(
                tags: ['Authentication'],
                responses: [
                    '200' => new Response(
                        description: 'Successfully logged out'
                    ),
                    '401' => new Response(
                        description: 'Authentication required'
                    )
                ],
                summary: 'Logout user and invalidate refresh token',
                description: 'Logs out the current user and invalidates their refresh token',
                requestBody: new RequestBody(
                    content: new ArrayObject(
                        [
                        'application/json' => [
                            'schema' => [
                                'type' => 'object',
                                'properties' => [
                                    'refresh_token' => [
                                        'type' => 'string',
                                        'description' => 'The refresh token to invalidate'
                                    ]
                                ]
                            ]
                        ]
                        ]
                    )
                )
            ),
            description: 'Logs out the current user and invalidates their refresh token',
            security: "is_granted('IS_AUTHENTICATED_FULLY')",
            name: 'api_logout',
        )
    ]
)]
class LogoutApi
{
}
