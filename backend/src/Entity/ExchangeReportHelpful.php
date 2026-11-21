<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

/**
 * "Nuttig" on one part of an exchange report: a topic (ExchangeTopic value) or one of its courses
 * ("course-{index}"). One per user per part.
 */
#[ORM\Entity]
#[ORM\UniqueConstraint(name: 'exchange_report_helpful_unique', columns: ['report_id', 'user_id', 'part'])]
class ExchangeReportHelpful extends BaseEntity
{
    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ExchangeReport $report;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private User $user;

    #[ORM\Column(length: 32)]
    private string $part;

    public function __construct(ExchangeReport $report, User $user, string $part)
    {
        $this->report = $report;
        $this->user = $user;
        $this->part = $part;
    }

    public function getReport(): ExchangeReport
    {
        return $this->report;
    }

    public function getUser(): User
    {
        return $this->user;
    }

    public function getPart(): string
    {
        return $this->part;
    }
}
