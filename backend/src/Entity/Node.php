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
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    private User $creator;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    protected DateTimeInterface $createDate;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    protected DateTimeInterface $updateDate;

    public function __construct(User $creator)
    {
        $this->creator = $creator;
        $this->createDate = new DateTimeImmutable();
        $this->updateDate = $this->createDate;
    }

    public function getId(): ?int
    {
        return $this->id;
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
}
