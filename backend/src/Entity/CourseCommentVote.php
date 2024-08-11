<?php

namespace App\Entity;

use App\Repository\CourseCommentVoteRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: CourseCommentVoteRepository::class)]
class CourseCommentVote extends AbstractVote
{
    #[ORM\ManyToOne(inversedBy: 'courseComments')]
    #[ORM\JoinColumn(nullable: false)]
    private ?CourseComment $comment = null;

    public function getComment(): ?CourseComment
    {
        return $this->comment;
    }

    public function setComment(?CourseComment $comment): self
    {
        $this->comment = $comment;

        return $this;
    }
}
