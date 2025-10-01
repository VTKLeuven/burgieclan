<?php

namespace App\Entity;

use App\Repository\DocumentCommentRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: DocumentCommentRepository::class)]
class DocumentComment extends AbstractComment implements VotableInterface
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'cascade')]
    private ?Document $document = null;

    #[ORM\OneToMany(
        mappedBy: 'documentComment',
        targetEntity: DocumentCommentVote::class,
        cascade: ['persist', 'remove']
    )]
    private Collection $votes;
    
    public function __construct(User $creator)
    {
        parent::__construct($creator);
        $this->votes = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
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

    /**
     * Get votes for this document comment
     *
     * @return Collection<int, DocumentCommentVote>
     */
    public function getVotes(): Collection
    {
        return $this->votes ?? new ArrayCollection();
    }

    /**
     * Calculate the vote score (upvotes - downvotes) for this document comment
     *
     * @return int
     */
    public function getVoteScore(): int
    {
        $score = 0;
        foreach ($this->getVotes() as $vote) {
            $score += $vote->getVoteType();
        }
        return $score;
    }

    /**
     * Get a specific user's vote on this document comment
     *
     * @param User $user
     *
     * @return DocumentCommentVote|null
     */
    public function getUserVote(User $user): ?DocumentCommentVote
    {
        foreach ($this->getVotes() as $vote) {
            if ($vote->getCreator() === $user) {
                return $vote;
            }
        }
        return null;
    }

    /**
     * Get the number of upvotes
     *
     * @return int
     */
    public function getUpvoteCount(): int
    {
        $count = 0;
        foreach ($this->getVotes() as $vote) {
            if ($vote->isUpvote()) {
                $count++;
            }
        }
        return $count;
    }

    /**
     * Get the number of downvotes
     *
     * @return int
     */
    public function getDownvoteCount(): int
    {
        $count = 0;
        foreach ($this->getVotes() as $vote) {
            if ($vote->isDownvote()) {
                $count++;
            }
        }
        return $count;
    }

    /**
     * Check if a specific user has voted on this document comment
     *
     * @param User $user
     *
     * @return bool
     */
    public function hasUserVoted(User $user): bool
    {
        return $this->getUserVote($user) !== null;
    }

    /**
     * Add a vote to this document comment
     *
     * @param DocumentCommentVote $vote
     *
     * @return DocumentComment
     */
    public function addVote(DocumentCommentVote $vote): static
    {
        if (!$this->votes->contains($vote)) {
            $this->votes->add($vote);
            $vote->setDocumentComment($this);
        }
        return $this;
    }

    /**
     * Remove a vote from this document comment
     *
     * @param DocumentCommentVote $vote
     *
     * @return DocumentComment
     */
    public function removeVote(DocumentCommentVote $vote): static
    {
        if ($this->votes->removeElement($vote)) {
            // Set the owning side to null (unless already changed)
            if ($vote->getDocumentComment() === $this) {
                $vote->setDocumentComment(null);
            }
        }
        return $this;
    }
}
