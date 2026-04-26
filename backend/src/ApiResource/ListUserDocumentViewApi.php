<?php

namespace App\ApiResource;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Post;
use App\Constants\SerializationGroups;
use App\Controller\Api\AddDocumentViewToUserController;
use Symfony\Component\Serializer\Attribute\Groups;

#[ApiResource(
    shortName: 'UserDocumentView',
    operations: [
        new Post(
            uriTemplate: 'document_views/batch',
            controller: AddDocumentViewToUserController::class,
            denormalizationContext: ['groups' => [SerializationGroups::USER_DOCUMENT_VIEWS_BATCH]],
        ),
    ],
)]
class ListUserDocumentViewApi
{
    /**
     * @var UserDocumentViewApi[]
     */
    #[Groups([SerializationGroups::USER_DOCUMENT_VIEWS_BATCH])]
    public array $userDocumentViews = [];
}
