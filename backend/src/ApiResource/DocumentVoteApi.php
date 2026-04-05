<?php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\State\Options;
use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Post;
use ApiPlatform\OpenApi\Model\Operation;
use ApiPlatform\OpenApi\Model\Parameter;
use App\Controller\Api\CreateVoteController;
use App\Controller\Api\DeleteVoteController;
use App\Entity\DocumentVote;
use App\State\EntityClassDtoStateProcessor;
use App\State\EntityClassDtoStateProvider;
use Symfony\Component\Serializer\Attribute\Groups;

#[ApiResource(
    shortName: 'DocumentVote',
    operations: [
        new Post(
            uriTemplate: '/documents/{id}/votes',
            controller: CreateVoteController::class,
            security: 'is_granted("ROLE_USER")',
            read: false,
            openapi: new Operation(
                summary: 'Create or update a vote on a document',
                parameters: [
                    new Parameter(
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: [
                            'type' => 'integer',
                        ],
                        description: 'Document ID'
                    )
                ]
            )
        ),
        new Delete(
            uriTemplate: '/documents/{id}/votes',
            controller: DeleteVoteController::class,
            security: 'is_granted("ROLE_USER")',
            read: false,
            openapi: new Operation(
                summary: 'Remove vote from a document',
                parameters: [
                    new Parameter(
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: [
                            'type' => 'integer',
                        ],
                        description: 'Document ID'
                    )
                ]
            )
        ),
    ],
    normalizationContext: ['groups' => ['vote:read']],
    denormalizationContext: ['groups' => ['vote:write']],
    provider: EntityClassDtoStateProvider::class,
    processor: EntityClassDtoStateProcessor::class,
    stateOptions: new Options(entityClass: DocumentVote::class),
)]
class DocumentVoteApi extends AbstractVoteApi
{
    #[ApiProperty(writable: false)]
    #[Groups(['vote:read'])]
    public ?DocumentApi $document = null;
}
