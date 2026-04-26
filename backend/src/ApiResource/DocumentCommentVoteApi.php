<?php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\State\Options;
use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Post;
use ApiPlatform\OpenApi\Model\Operation;
use ApiPlatform\OpenApi\Model\Parameter;
use App\Constants\SerializationGroups;
use App\Controller\Api\CreateVoteController;
use App\Controller\Api\DeleteVoteController;
use App\Entity\DocumentCommentVote;
use App\State\EntityClassDtoStateProcessor;
use App\State\EntityClassDtoStateProvider;
use Symfony\Component\Serializer\Attribute\Groups;

#[ApiResource(
    shortName: 'DocumentCommentVote',
    operations: [
        new Post(
            uriTemplate: '/document-comments/{id}/votes',
            controller: CreateVoteController::class,
            security: 'is_granted("ROLE_USER")',
            read: false,
            openapi: new Operation(
                summary: 'Create or update a vote on a document comment',
                parameters: [
                    new Parameter(
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: [
                            'type' => 'integer',
                        ],
                        description: 'Document Comment ID'
                    )
                ]
            )
        ),
        new Delete(
            uriTemplate: '/document-comments/{id}/votes',
            controller: DeleteVoteController::class,
            security: 'is_granted("ROLE_USER")',
            read: false,
            openapi: new Operation(
                summary: 'Remove vote from a document comment',
                parameters: [
                    new Parameter(
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: [
                            'type' => 'integer',
                        ],
                        description: 'Document Comment ID'
                    )
                ]
            )
        ),
    ],
    normalizationContext: ['groups' => [SerializationGroups::BASE_READ, SerializationGroups::VOTE_READ]],
    denormalizationContext: ['groups' => [SerializationGroups::VOTE_WRITE]],
    provider: EntityClassDtoStateProvider::class,
    processor: EntityClassDtoStateProcessor::class,
    stateOptions: new Options(entityClass: DocumentCommentVote::class),
)]
class DocumentCommentVoteApi extends AbstractVoteApi
{
    #[ApiProperty(writable: false)]
    #[Groups([SerializationGroups::VOTE_READ])]
    public ?DocumentCommentApi $documentComment = null;
}
