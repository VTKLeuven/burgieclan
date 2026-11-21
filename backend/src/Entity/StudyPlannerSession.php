<?php

namespace App\Entity;

use DateTimeImmutable;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * One stretch of studying timed with the study timer of the "Blok" calendar: from pressing start
 * (or resume) to pressing pause. While it runs, $endedAt is null; someone has at most one running.
 * A day's sessions tell when they started, when they stopped and how long they studied.
 *
 * $date is the Leuven date it started on, so a session past midnight still counts for that day.
 */
#[ORM\Entity]
#[ORM\Index(name: 'idx_study_planner_session_user', columns: ['user_id', 'date'])]
class StudyPlannerSession extends BaseEntity
{
    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private User $user;

    /** "YYYY-MM-DD" in Leuven. */
    #[ORM\Column(type: Types::STRING, length: 10)]
    private string $date;

    #[ORM\Column(type: Types::DATETIMETZ_IMMUTABLE)]
    private DateTimeImmutable $startedAt;

    #[ORM\Column(type: Types::DATETIMETZ_IMMUTABLE, nullable: true)]
    private ?DateTimeImmutable $endedAt = null;

    public function __construct(User $user, string $date, DateTimeImmutable $startedAt)
    {
        $this->user = $user;
        $this->date = $date;
        $this->startedAt = $startedAt;
    }

    public function getUser(): User
    {
        return $this->user;
    }

    public function getDate(): string
    {
        return $this->date;
    }

    public function getStartedAt(): DateTimeImmutable
    {
        return $this->startedAt;
    }

    public function getEndedAt(): ?DateTimeImmutable
    {
        return $this->endedAt;
    }

    public function isRunning(): bool
    {
        return null === $this->endedAt;
    }

    public function end(DateTimeImmutable $at): self
    {
        $this->endedAt = max($at, $this->startedAt);

        return $this;
    }
}
