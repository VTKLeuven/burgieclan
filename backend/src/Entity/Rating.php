<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Doctrine\DBAL\Types\Types;

/**
 * Defines the properties of the Rating entity to represent the application ratings.
 *
 * @author Rémi Mentens
 */
#[ORM\Entity(repositoryClass: CourseRepository::class)]
#[ORM\Table(name: 'burgieclan_ratings')]
class Rating
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\Column(type: Types::INTEGER)]
    private ?int $score = null;

    #[ORM\ManyToOne(targetEntity: User::class, inversedBy: "ratings")]
    #[ORM\JoinColumn(name: "user_id", referencedColumnName: "id", nullable: false)]
    private ?User $author = null;

    #[ORM\ManyToOne(targetEntity: Comment::class, inversedBy: "ratings")]
    #[ORM\JoinColumn(name: "comment_id", referencedColumnName: "id", nullable: false)]
    private ?Commment $comment = null;
    
    public function getId(): ?int
    {
        return $this->id;
    }

    public function getScore(): ?int
    {
        return $this->score;
    }

    public function setScore(int $score): self
    {
        $this->score = $score;

        return $this;
    }

    public function getUser(): ?User
    {
        return $this->user;
    }

    public function setUser(?User $user): self
    {
        $this->user = $user;

        return $this;
    }

    public function getComment(): ?Comment
    {
        return $this->comment;
    }
    public function setComment(?Comment $comment): self
    {
        $this->comment = $comment;
        return $this;
    }
}