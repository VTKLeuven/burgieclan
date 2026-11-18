<?php

namespace App\Entity;

use DateTimeImmutable;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * A deadline or a mandatory session someone entered by hand in their study planner, for one of
 * the subjects of their timetable.
 *
 * $subject is the key the planner gives that subject ("course:12" or "name:Thermal Systems");
 * $subjectLabel keeps its name from when the item was saved, for when the subject disappears from
 * the timetable.
 */
#[ORM\Entity]
class StudyPlannerItem extends BaseEntity
{
    public const KIND_DEADLINE = 'deadline';
    public const KIND_MANDATORY = 'mandatory';
    public const MAX_TITLE = 200;
    public const MAX_NOTE = 2000;

    #[ORM\ManyToOne(inversedBy: 'items')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private StudyPlanner $planner;

    #[ORM\Column(type: Types::STRING, length: 255)]
    private string $subject;

    #[ORM\Column(type: Types::STRING, length: 255)]
    private string $subjectLabel;

    #[ORM\Column(type: Types::STRING, length: 16)]
    private string $kind;

    #[ORM\Column(type: Types::STRING, length: self::MAX_TITLE)]
    private string $title;

    /** "YYYY-MM-DD" in Leuven. */
    #[ORM\Column(type: Types::STRING, length: 10)]
    private string $date;

    /** "HH:MM", or null for a deadline at the end of the day / a session without a time. */
    #[ORM\Column(type: Types::STRING, length: 5, nullable: true)]
    private ?string $time = null;

    /** End time of a mandatory session, after $time. */
    #[ORM\Column(type: Types::STRING, length: 5, nullable: true)]
    private ?string $endTime = null;

    #[ORM\Column(type: Types::TEXT)]
    private string $note = '';

    #[ORM\Column(type: Types::DATETIMETZ_IMMUTABLE, nullable: true)]
    private ?DateTimeImmutable $doneAt = null;

    public function __construct(StudyPlanner $planner)
    {
        $this->planner = $planner;
    }

    public function getPlanner(): StudyPlanner
    {
        return $this->planner;
    }

    public function getSubject(): string
    {
        return $this->subject;
    }

    public function getSubjectLabel(): string
    {
        return $this->subjectLabel;
    }

    public function getKind(): string
    {
        return $this->kind;
    }

    public function getTitle(): string
    {
        return $this->title;
    }

    public function getDate(): string
    {
        return $this->date;
    }

    public function getTime(): ?string
    {
        return $this->time;
    }

    public function getEndTime(): ?string
    {
        return $this->endTime;
    }

    public function getNote(): string
    {
        return $this->note;
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
     * Sets every field the form edits; the values are validated by StudyPlannerOperations.
     */
    public function fill(
        string $subject,
        string $subjectLabel,
        string $kind,
        string $title,
        string $date,
        ?string $time,
        ?string $endTime,
        string $note,
    ): self {
        $this->subject = $subject;
        $this->subjectLabel = mb_substr($subjectLabel, 0, 255);
        $this->kind = $kind;
        $this->title = $title;
        $this->date = $date;
        $this->time = $time;
        $this->endTime = $endTime;
        $this->note = $note;

        return $this;
    }
}
