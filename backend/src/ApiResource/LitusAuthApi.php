<?php

namespace App\ApiResource;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Post;
use App\Controller\Api\LitusAuthApiController;

#[ApiResource(
    shortName: 'Litus Authentication',
    operations: [
        new Post(
            uriTemplate: '/auth/litus',
            controller: LitusAuthApiController::class,
            name: 'Litus Authentication'
        ),
    ]
)]
class LitusAuthApi
{
    public string $accessToken;
}
