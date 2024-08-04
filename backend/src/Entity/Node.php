<?php

namespace App\Entity;

use DateTime;
use DateTimeImmutable;
use DateTimeInterface;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;

#[ORM\MappedSuperclass]
#[ORM\HasLifecycleCallbacks]
abstract class Node
{
    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    private User $creator;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    protected DateTimeInterface $createDate;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    protected DateTimeInterface $updateDate;

    #[ORM\OneToMany(mappedBy: 'node', targetEntity: Node::class)]
    private Collection $votes;

    public function __construct(User $creator)
    {
        $this->creator = $creator;
        $this->createDate = new DateTimeImmutable();
        $this->updateDate = $this->createDate;
        $this->votes = new ArrayCollection();
    }

    public function getCreator(): User
    {
        return $this->creator;
    }

    public function setCreator(User $creator): static
    {
        $this->creator = $creator;

        return $this;
    }

    public function getCreateDate(): DateTimeInterface
    {
        return $this->createDate;
    }

    public function getUpdateDate(): DateTimeInterface
    {
        return $this->updateDate;
    }

    // can be used to update the date when the node is updated
    #[ORM\PreUpdate]
    public function setUpdateDate(): self
    {
        $this->updateDate = new DateTime();

        return $this;
    }
    
    public function getVotes(): Collection
    {
        return $this->votes;
    }

    public function addVote(self $vote): self
    {
        if (!$this->votes->contains($vote)) {
            $this->votes->add($vote);
        }

        return $this;
    }

    public function removeVote(self $vote): self
    {
        if ($this->votes->removeElement($vote)) {
            $this->votes->removeElement($vote);
        }
        return $this;
    }
}
