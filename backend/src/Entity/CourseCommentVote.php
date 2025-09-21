<?php

namespace App\Entity;

use App\Repository\CourseCommentVoteRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: CourseCommentVoteRepository::class)]
#[ORM\UniqueConstraint(name: 'unique_user_vote_per_course_comment', columns: ['creator_id', 'course_comment_id'])]
class CourseCommentVote extends Node
{
    public const UPVOTE = 1;
    public const DOWNVOTE = -1;

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: CourseComment::class, inversedBy: 'votes')]
    #[ORM\JoinColumn(nullable: false)]
    private ?CourseComment $courseComment = null;

    #[ORM\Column]
    private ?int $voteType = null;

    public function __construct(User $creator)
    {
        parent::__construct($creator);
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getCourseComment(): ?CourseComment
    {
        return $this->courseComment;
    }

    public function setCourseComment(?CourseComment $courseComment): static
    {
        $this->courseComment = $courseComment;

        return $this;
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
