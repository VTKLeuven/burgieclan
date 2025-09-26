<?php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\State\Options;
use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Post;
use App\Controller\Api\CreateVoteController;
use App\Controller\Api\DeleteVoteController;
use App\Entity\CourseCommentVote;
use App\State\EntityClassDtoStateProcessor;
use App\State\EntityClassDtoStateProvider;
use Symfony\Component\Serializer\Attribute\Groups;

#[ApiResource(
    shortName: 'Course Comment Vote',
    operations: [
        new Post(
            uriTemplate: '/course-comments/{id}/votes',
            controller: CreateVoteController::class,
            security: 'is_granted("ROLE_USER")',
            read: false,
            openapiContext: [
                'summary' => 'Create or update a vote on a course comment',
                'parameters' => [
                    [
                        'name' => 'id',
                        'in' => 'path',
                        'required' => true,
                        'schema' => ['type' => 'integer'],
                        'description' => 'Course Comment ID'
                    ]
                ]
            ]
        ),
        new Delete(
            uriTemplate: '/course-comments/{id}/votes',
            controller: DeleteVoteController::class,
            security: 'is_granted("ROLE_USER")',
            read: false,
            openapiContext: [
                'summary' => 'Remove vote from a course comment',
                'parameters' => [
                    [
                        'name' => 'id',
                        'in' => 'path',
                        'required' => true,
                        'schema' => ['type' => 'integer'],
                        'description' => 'Course Comment ID'
                    ]
                ]
            ]
        ),
    ],
    normalizationContext: ['groups' => ['vote:read']],
    denormalizationContext: ['groups' => ['vote:write']],
    provider: EntityClassDtoStateProvider::class,
    processor: EntityClassDtoStateProcessor::class,
    stateOptions: new Options(entityClass: CourseCommentVote::class),
)]
class CourseCommentVoteApi extends AbstractVoteApi
{
    #[ApiProperty(writable: false)]
    #[Groups(['vote:read'])]
    public ?CourseCommentApi $courseComment = null;
}
