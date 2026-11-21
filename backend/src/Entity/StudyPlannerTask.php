<?php

namespace App\Entity;

use DateTimeImmutable;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * What someone plans to study on a day of the "Blok" calendar: "H1-H3" of Linear Algebra, "Lesvideo
 * 1-2" of Computer Architecture. Ticked off once done; past and not ticked off, it is one to catch up.
 *
 * $subject is null for a task of no course in particular, else a key as in StudyPlannerExam.
 */
#[ORM\Entity]
#[ORM\Index(name: 'idx_study_planner_task_user', columns: ['user_id', 'date'])]
class StudyPlannerTask extends BaseEntity
{
    public const MAX_TITLE = 300;
    public const MAX_PER_USER = 3000;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private User $user;

    /** "YYYY-MM-DD" in Leuven. */
    #[ORM\Column(type: Types::STRING, length: 10)]
    private string $date;

    #[ORM\Column(type: Types::STRING, length: 255, nullable: true)]
    private ?string $subject = null;

    #[ORM\Column(type: Types::STRING, length: 255, nullable: true)]
    private ?string $subjectLabel = null;

    #[ORM\Column(type: Types::STRING, length: self::MAX_TITLE)]
    private string $title;

    #[ORM\Column(type: Types::DATETIMETZ_IMMUTABLE, nullable: true)]
    private ?DateTimeImmutable $doneAt = null;

    public function __construct(User $user)
    {
        $this->user = $user;
    }

    public function getUser(): User
    {
        return $this->user;
    }

    public function getDate(): string
    {
        return $this->date;
    }

    public function setDate(string $date): self
    {
        $this->date = $date;

        return $this;
    }

    public function getSubject(): ?string
    {
        return $this->subject;
    }

    public function getSubjectLabel(): ?string
    {
        return $this->subjectLabel;
    }

    public function getTitle(): string
    {
        return $this->title;
    }

    public function getDoneAt(): ?DateTimeImmutable
    {
        return $this->doneAt;
    }

    public function setDone(bool $done, DateTimeImmutable $at): self
    {
        $this->doneAt = $done ? ($this->doneAt ?? $at) : null;

        return $this;
    }

    /**
     * The values are validated by StudyPlannerBlok.
     */
    public function fill(string $date, ?string $subject, ?string $subjectLabel, string $title): self
    {
        $this->date = $date;
        $this->subject = $subject;
        $this->subjectLabel = null === $subjectLabel ? null : mb_substr($subjectLabel, 0, 255);
        $this->title = $title;

        return $this;
    }
}
