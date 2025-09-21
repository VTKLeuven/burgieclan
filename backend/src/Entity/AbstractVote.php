<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

abstract class AbstractVote extends Node
{
    public const UPVOTE = 1;
    public const DOWNVOTE = -1;

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    protected ?int $id = null;

    #[ORM\Column]
    protected ?int $voteType = null;

    public function __construct(User $creator)
    {
        parent::__construct($creator);
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getVoteType(): ?int
    {
        return $this->voteType;
    }

    public function setVoteType(int $voteType): static
    {
        if (!in_array($voteType, [self::UPVOTE, self::DOWNVOTE], true)) {
            throw new \InvalidArgumentException('Invalid vote type. Must be UPVOTE or DOWNVOTE.');
        }
        $this->voteType = $voteType;
        return $this;
    }

    public function isUpvote(): bool
    {
        return $this->voteType === self::UPVOTE;
    }

    public function isDownvote(): bool
    {
        return $this->voteType === self::DOWNVOTE;
    }

    public function setUpvote(): static
    {
        $this->voteType = self::UPVOTE;
        return $this;
    }

    public function setDownvote(): static
    {
        $this->voteType = self::DOWNVOTE;
        return $this;
    }
}
