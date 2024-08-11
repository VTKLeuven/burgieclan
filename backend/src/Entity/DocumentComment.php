<?php

namespace App\Entity;

use App\Repository\DocumentCommentRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: DocumentCommentRepository::class)]
class DocumentComment extends AbstractComment
{
    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'cascade')]
    private ?Document $document = null;

    /**
     * @var Collection
     */
    #[ORM\OneToMany(
        mappedBy: 'comment',
        targetEntity: DocumentCommentVote::class,
        cascade: ['remove'],
        orphanRemoval: true
    )]
    private Collection $votes;

    public function __construct(User $creator)
    {
        parent::__construct($creator);
        $this->votes = new ArrayCollection();
    }

    public function getDocument(): ?Document
    {
        return $this->document;
    }

    public function setDocument(?Document $document): static
    {
        $this->document = $document;

        return $this;
    }

    public function getVotes(): Collection
    {
        return $this->votes;
    }

    public function addVote(DocumentCommentVote $vote): self
    {
        if (!$this->votes->contains($vote)) {
            $this->votes->add($vote);
            $vote->setComment($this);
        }

        return $this;
    }

    public function removeVote(DocumentCommentVote $vote): self
    {
        if ($this->votes->removeElement($vote)) {
            $vote->setComment(null);
        }

        return $this;
    }
}
