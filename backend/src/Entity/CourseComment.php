<?php

namespace App\Entity;

use App\Repository\CourseCommentRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: CourseCommentRepository::class)]
class CourseComment extends AbstractComment implements VotableInterface
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'courseComments')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Course $course = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    private ?CommentCategory $category = null;

    #[ORM\OneToMany(mappedBy: 'courseComment', targetEntity: CourseCommentVote::class, cascade: ['persist', 'remove'])]
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

    public function getCourse(): ?Course
    {
        return $this->course;
    }

    public function setCourse(?Course $course): self
    {
        $this->course = $course;

        return $this;
    }

    public function getCategory(): ?CommentCategory
    {
        return $this->category;
    }

    public function setCategory(?CommentCategory $category): self
    {
        $this->category = $category;

        return $this;
    }

    /**
     * Get votes for this course comment
     *
     * @return Collection<int, CourseCommentVote>
     */
    public function getVotes(): Collection
    {
        return $this->votes ?? new ArrayCollection();
    }

    /**
     * Calculate the vote score (upvotes - downvotes) for this course comment
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
     * Get a specific user's vote on this course comment
     *
     * @param User $user
     *
     * @return CourseCommentVote|null
     */
    public function getUserVote(User $user): ?CourseCommentVote
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
     * Check if a specific user has voted on this course comment
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
     * Add a vote to this course comment
     *
     * @param CourseCommentVote $vote
     *
     * @return CourseCommentVote
     */
    public function addVote(CourseCommentVote $vote): static
    {
        if (!$this->votes->contains($vote)) {
            $this->votes->add($vote);
            $vote->setCourseComment($this);
        }

        return $this;
    }

    /**
     * Remove a vote from this course comment
     *
     * @param CourseCommentVote $vote
     *
     * @return CourseCommentVote
     */
    public function removeVote(CourseCommentVote $vote): static
    {
        if ($this->votes->removeElement($vote)) {
            // Set the owning side to null (unless already changed)
            if ($vote->getCourseComment() === $this) {
                $vote->setCourseComment(null);
            }
        }

        return $this;
    }
}
