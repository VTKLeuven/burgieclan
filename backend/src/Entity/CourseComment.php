<?php

namespace App\Entity;

use App\Repository\CourseCommentRepository;
use Doctrine\ORM\Mapping as ORM;
use Doctrine\DBAL\Types\Types;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;

#[ORM\Entity(repositoryClass: CourseCommentRepository::class)]
class CourseComment extends AbstractComment
{
    #[ORM\ManyToOne(inversedBy: 'courseComments')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Course $course = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    private ?CommentCategory $category = null;

    /**
     * @var Collection
     */
    #[ORM\OneToMany(
        mappedBy: 'comment',
        targetEntity: CourseCommentVote::class,
        cascade: ['remove'],
        orphanRemoval: true
    )]
    private Collection $votes;

    public function __construct(User $creator)
    {
        parent::__construct($creator);
        $this->votes = new ArrayCollection();
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

    public function getVotes(): Collection
    {
        return $this->votes;
    }

    public function addVote(CourseCommentVote $vote): self
    {
        if (!$this->votes->contains($vote)) {
            $this->votes->add($vote);
            $vote->setComment($this);
        }

        return $this;
    }

    public function removeVote(CourseCommentVote $vote): self
    {
        if ($this->votes->removeElement($vote)) {
            $vote->setComment(null);
        }

        return $this;
    }
}
