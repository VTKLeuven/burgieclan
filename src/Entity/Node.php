<?php

namespace App\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\MappedSuperclass]
#[ORM\HasLifecycleCallbacks]
abstract class Node
{
    #[ORM\ManyToOne(inversedBy: 'nodes')]
    private ?User $user = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private ?\DateTimeInterface $createDate;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private ?\DateTimeInterface $updateDate;

    public function __construct()
    {
        $this->createDate = new \DateTimeImmutable();
        $this->updateDate = $this->createDate;
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

    public function getCreateDate(): ?\DateTimeInterface
    {
        return $this->createDate;
    }

    public function getUpdateDate(): ?\DateTimeInterface
    {
        return $this->updateDate;
    }

    // can be used to update the date when the node is updated
    #[ORM\PreUpdate]
    public function setUpdateDate(): self
    {
        $this->updateDate = new \DateTime();

        return $this;
    }
}
