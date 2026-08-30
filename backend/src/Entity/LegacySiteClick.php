<?php

namespace App\Entity;

use App\Repository\LegacySiteClickRepository;
use DateTimeImmutable;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: LegacySiteClickRepository::class)]
#[ORM\Index(columns: ['last_clicked_at'])]
#[ORM\UniqueConstraint(name: 'uniq_legacy_site_click_user', columns: ['user_id'])]
class LegacySiteClick extends BaseEntity
{
    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private User $user;

    #[ORM\Column(options: ['default' => 1])]
    private int $clickCount = 1;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private DateTimeImmutable $lastClickedAt;

    public function __construct(User $user, DateTimeImmutable $clickedAt)
    {
        $this->user = $user;
        $this->lastClickedAt = $clickedAt;
    }

    public function getUser(): User
    {
        return $this->user;
    }

    public function getClickCount(): int
    {
        return $this->clickCount;
    }

    public function getLastClickedAt(): DateTimeImmutable
    {
        return $this->lastClickedAt;
    }

    public function recordClick(DateTimeImmutable $clickedAt): void
    {
        ++$this->clickCount;
        $this->lastClickedAt = $clickedAt;
    }

    public function __toString(): string
    {
        return sprintf('%s (%d clicks)', $this->user->getUserIdentifier(), $this->clickCount);
    }
}
