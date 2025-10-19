<?php

namespace App\ApiResource;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use App\Controller\Api\GetVoteSummaryController;
use App\Entity\AbstractVote;
use Symfony\Component\Validator\Constraints as Assert;

#[ApiResource(
    shortName: 'Vote Summary',
    operations: [
        new Get(
            uriTemplate: '/documents/{id}/votes',
            controller: GetVoteSummaryController::class,
            read: false,
            openapiContext: [
                'summary' => 'Get vote summary for a document',
                'parameters' => [
                    [
                        'name' => 'id',
                        'in' => 'path',
                        'required' => true,
                        'schema' => ['type' => 'integer'],
                        'description' => 'Document ID'
                    ]
                ]
            ]
        ),
        new Get(
            uriTemplate: '/document-comments/{id}/votes',
            controller: GetVoteSummaryController::class,
            read: false,
            openapiContext: [
                'summary' => 'Get vote summary for a document comment',
                'parameters' => [
                    [
                        'name' => 'id',
                        'in' => 'path',
                        'required' => true,
                        'schema' => ['type' => 'integer'],
                        'description' => 'Document Comment ID'
                    ]
                ]
            ]
        ),
        new Get(
            uriTemplate: '/course-comments/{id}/votes',
            controller: GetVoteSummaryController::class,
            read: false,
            openapiContext: [
                'summary' => 'Get vote summary for a course comment',
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
)]
class VoteSummaryApi
{
    #[ApiProperty(readable: false, writable: false, identifier: true)]
    public ?int $id = null;

    #[ApiProperty(description: 'Number of upvotes')]
    public int $upvotes = 0;

    #[ApiProperty(description: 'Number of downvotes')]
    public int $downvotes = 0;

    #[ApiProperty(description: 'Vote score (upvotes - downvotes)')]
    public int $sum = 0;

    #[ApiProperty(description: 'Current user vote')]
    #[Assert\Choice(
        choices: [AbstractVote::UPVOTE, AbstractVote::DOWNVOTE],
        message: 'Vote type must be either UPVOTE (1) or DOWNVOTE (-1).'
    )]
    public int $currentUserVote = 0;
}
