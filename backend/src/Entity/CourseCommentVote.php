<?php

namespace App\Entity;

use App\Repository\CourseCommentVoteRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: CourseCommentVoteRepository::class)]
#[ORM\UniqueConstraint(name: 'unique_user_vote_per_course_comment', columns: ['creator_id', 'course_comment_id'])]
// Node::$creator is shared by every content entity, so the back-reference is declared per subclass.
#[ORM\AssociationOverrides([new ORM\AssociationOverride(name: 'creator', inversedBy: 'courseCommentVotes')])]
class CourseCommentVote extends AbstractVote
{
    #[ORM\ManyToOne(targetEntity: CourseComment::class, inversedBy: 'votes')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private CourseComment $courseComment;

    public function getCourseComment(): ?CourseComment
    {
        return $this->courseComment;
    }

    public function setCourseComment(CourseComment $courseComment): static
    {
        $this->courseComment = $courseComment;

        return $this;
    }

    public function __toString(): string
    {
        return sprintf('%s (%s)', $this->getVoteType(), $this->getCourseComment()->getContent());
    }
}
