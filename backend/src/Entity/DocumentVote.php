<?php

namespace App\Entity;

use App\Repository\DocumentVoteRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: DocumentVoteRepository::class)]
class DocumentVote extends AbstractVote
{
    #[ORM\ManyToOne(inversedBy: 'document')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Document $document = null;

    public function getDocument(): ?Document
    {
        return $this->document;
    }

    public function setDocument(?Document $document): self
    {
        $this->document = $document;

        return $this;
    }
}
