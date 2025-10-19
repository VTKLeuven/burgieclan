<?php

namespace App\Entity;

use App\Repository\DocumentVoteRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: DocumentVoteRepository::class)]
#[ORM\UniqueConstraint(name: 'unique_user_vote_per_document', columns: ['creator_id', 'document_id'])]
class DocumentVote extends AbstractVote
{
    #[ORM\ManyToOne(targetEntity: Document::class, inversedBy: 'votes')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Document $document;

    public function getDocument(): Document
    {
        return $this->document;
    }

    public function setDocument(Document $document): static
    {
        $this->document = $document;

        return $this;
    }

    public function __toString(): string
    {
        return sprintf('%s (%s)', $this->getVoteType(), $this->getDocument()->getName());
    }
}
