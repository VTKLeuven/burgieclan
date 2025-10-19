<?php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\State\Options;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Post;
use App\Controller\Api\AddDocumentViewToUserController;
use App\Entity\UserDocumentView;
use Symfony\Component\Serializer\Attribute\Groups;

#[ApiResource(
    shortName: 'User document view',
    operations: [
        new Post(
            uriTemplate: 'document_views/batch',
            controller: AddDocumentViewToUserController::class,
            denormalizationContext: ['groups' => ['user:document_views:batch']],
        ),
    ],
)]
class ListUserDocumentViewApi
{
    /**
     * @var UserDocumentViewApi[]
     */
    #[Groups('user:document_views:batch')]
    public array $userDocumentViews = [];
}
