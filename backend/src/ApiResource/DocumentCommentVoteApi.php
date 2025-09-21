<?php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\State\Options;
use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Entity\DocumentCommentVote;
use App\State\EntityClassDtoStateProcessor;
use App\State\EntityClassDtoStateProvider;
use Symfony\Component\Validator\Constraints as Assert;

#[ApiResource(
    shortName: 'Document Comment Vote',
    operations: [
        new Get(),
        new GetCollection(),
        new Patch(
        // This redirects the security check to all voters to see if one accepts DocumentCommentVoteApi objects
        // This is handled by the src/Security/Voter/AbstractVoteVoter
            security: 'is_granted("EDIT", object)'
        ),
        new Post(),
        new Delete(
        // This redirects the security check to all voters to see if one accepts DocumentCommentVoteApi objects
        // This is handled by the src/Security/Voter/AbstractVoteVoter
            security: 'is_granted("DELETE", object)'
        ),
    ],
    provider: EntityClassDtoStateProvider::class,
    processor: EntityClassDtoStateProcessor::class,
    stateOptions: new Options(entityClass: DocumentCommentVote::class),
)]
class DocumentCommentVoteApi extends AbstractVoteApi
{
    #[ApiFilter(SearchFilter::class, strategy: 'exact')]
    #[Assert\NotNull]
    public ?DocumentCommentApi $documentComment = null;
}
