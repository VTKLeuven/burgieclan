<?php

namespace App\Entity;

use DateTime;
use DateTimeImmutable;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\MappedSuperclass]
#[ORM\HasLifecycleCallbacks]
abstract class Node
{
    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private User $creator;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    protected DateTimeImmutable $createDate;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    protected DateTime $updateDate;

    public function __construct(User $creator)
    {
        $this->creator = $creator;
        $this->createDate = new DateTimeImmutable();
        $this->updateDate = new DateTime();
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

    public function getCreateDate(): DateTimeImmutable
    {
        return $this->createDate;
    }

    public function getUpdateDate(): DateTime
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
