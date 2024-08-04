<?php

namespace App\Entity;

use App\Repository\RatingRepository;
use Doctrine\ORM\Mapping as ORM;
use Doctrine\DBAL\Types\Types;

/**
 * Defines the properties of the Rating entity to represent the application ratings.
 *
 * @author Rémi Mentens
 */
#[ORM\Entity(repositoryClass: RatingRepository::class)]
#[ORM\Table(name: 'vote')]
class Vote extends Node
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\Column(type: 'boolean')]
    private bool $isUpvote;

    #[ORM\ManyToOne(targetEntity: Node::class, inversedBy: "votes")]
    #[ORM\JoinColumn(name: "node_id", referencedColumnName: "id", nullable: true)]
    private ?Node $node = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function isUpvote(): bool
    {
        return $this->isUpvote;
    }

    public function setUpvote(): self
    {
        $this->isUpvote = true;

        return $this;
    }

    public function setDownvote(): self
    {
        $this->isUpvote = false;

        return $this;
    }

    public function getNode(): ?Node
    {
        return $this->node;
    }

    public function setNode(?Node $node): self
    {
        $this->node = $node;

        return $this;
    }
}
