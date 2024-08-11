<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;

#[ORM\MappedSuperclass]
abstract class AbstractVote extends Node
{
    #[ORM\Column(type: 'boolean')]
    protected bool $isUpvote;

    public function __construct(User $creator, bool $isUpvote = true)
    {
        parent::__construct($creator);
        $this->isUpvote = $isUpvote;
    }

    public function isUpvote(): bool
    {
        return $this->isUpvote;
    }

    public function setUpvote(): self
    {
        $this->isUpvote = true;
        return $this;
    }

    public function setDownvote(): self
    {
        $this->isUpvote = false;
        return $this;
    }
}
