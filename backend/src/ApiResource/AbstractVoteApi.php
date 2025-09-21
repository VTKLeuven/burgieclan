<?php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\Filter\NumericFilter;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiProperty;
use App\Entity\AbstractVote;
use Symfony\Component\Validator\Constraints as Assert;

abstract class AbstractVoteApi extends NodeApi
{
    #[ApiProperty(readable: false, writable: false, identifier: true)]
    public ?int $id = null;

    #[ApiFilter(NumericFilter::class)]
    #[Assert\NotNull]
    #[Assert\Choice(
        choices: [AbstractVote::UPVOTE, AbstractVote::DOWNVOTE],
        message: 'Vote type must be either UPVOTE (1) or DOWNVOTE (-1).'
    )]
    public int $voteType;
}
