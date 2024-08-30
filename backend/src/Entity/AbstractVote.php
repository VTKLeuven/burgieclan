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

    public function setUpvote(bool $vote): self
    {
        $this->isUpvote = $vote;
        return $this;
    }

    public function upvote(): self
    {
        $this->isUpvote = true;
        return $this;
    }

    public function downvote(): self
    {
        $this->isUpvote = false;
        return $this;
    }
}
