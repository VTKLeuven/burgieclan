<?php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\Filter\BooleanFilter;
use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Metadata\ApiFilter;
use Symfony\Component\Validator\Constraints as Assert;

abstract class AbstractVoteApi extends NodeApi
{
    #[ApiFilter(BooleanFilter::class)]
    public bool $isUpvote;
}
