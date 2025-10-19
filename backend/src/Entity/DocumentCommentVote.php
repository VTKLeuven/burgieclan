<?php

namespace App\Entity;

use App\Repository\DocumentCommentVoteRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: DocumentCommentVoteRepository::class)]
#[ORM\UniqueConstraint(name: 'unique_user_vote_per_document_comment', columns: ['creator_id', 'document_comment_id'])]
class DocumentCommentVote extends AbstractVote
{
    #[ORM\ManyToOne(targetEntity: DocumentComment::class, inversedBy: 'votes')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private DocumentComment $documentComment;

    public function getDocumentComment(): DocumentComment
    {
        return $this->documentComment;
    }

    public function setDocumentComment(DocumentComment $documentComment): static
    {
        $this->documentComment = $documentComment;

        return $this;
    }

    public function __toString(): string
    {
        return sprintf('%s (%s)', $this->getVoteType(), $this->getDocumentComment()->getContent());
    }
}
