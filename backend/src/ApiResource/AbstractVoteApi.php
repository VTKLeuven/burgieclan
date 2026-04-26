<?php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\Filter\NumericFilter;
use ApiPlatform\Metadata\ApiFilter;
use App\Constants\SerializationGroups;
use App\Entity\AbstractVote;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Validator\Constraints as Assert;

abstract class AbstractVoteApi extends NodeApi
{
    #[ApiFilter(NumericFilter::class)]
    #[Assert\NotNull]
    #[Assert\Choice(
        choices: [AbstractVote::UPVOTE, AbstractVote::DOWNVOTE],
        message: 'Vote type must be either UPVOTE (1) or DOWNVOTE (-1).'
    )]
    #[Groups([SerializationGroups::VOTE_READ, SerializationGroups::VOTE_WRITE])]
    public int $voteType;
}
