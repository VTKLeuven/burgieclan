<?php

namespace App\Entity;

use App\Repository\DocumentCommentVoteRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: DocumentCommentVoteRepository::class)]
class DocumentCommentVote extends AbstractVote
{
    #[ORM\ManyToOne(inversedBy: 'courseComments')]
    #[ORM\JoinColumn(nullable: false)]

    private ?DocumentComment $comment = null;

    public function getComment(): ?DocumentComment
    {
        return $this->comment;
    }

    public function setComment(?DocumentComment $comment): self
    {
        $this->comment = $comment;

        return $this;
    }
}
