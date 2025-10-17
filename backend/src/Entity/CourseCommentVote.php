<?php

namespace App\Entity;

use App\Repository\CourseCommentVoteRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: CourseCommentVoteRepository::class)]
#[ORM\UniqueConstraint(name: 'unique_user_vote_per_course_comment', columns: ['creator_id', 'course_comment_id'])]
class CourseCommentVote extends AbstractVote
{
    #[ORM\ManyToOne(targetEntity: CourseComment::class, inversedBy: 'votes')]
    #[ORM\JoinColumn(nullable: false)]
    private ?CourseComment $courseComment = null;

    public function getCourseComment(): ?CourseComment
    {
        return $this->courseComment;
    }

    public function setCourseComment(?CourseComment $courseComment): static
    {
        $this->courseComment = $courseComment;

        return $this;
    }

    public function __toString(): string
    {
        return sprintf('%s (%s)', $this->getVoteType(), $this->getCourseComment()->getContent());
    }
}
