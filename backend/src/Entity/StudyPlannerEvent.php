<?php

namespace App\Entity;

use DateTimeImmutable;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * One session of a study planner's timetable, as KU Leuven's feed last described it, with what
 * its owner did with it. Never deleted by a sync: a session missing from the feed while it falls
 * inside the feed's window is marked $removedAt instead (cancelled, or a course dropped), and
 * loses that mark when it comes back.
 */
#[ORM\Entity]
#[ORM\UniqueConstraint(name: 'uniq_study_planner_event_uid', columns: ['planner_id', 'uid'])]
#[ORM\Index(name: 'idx_study_planner_event_start', columns: ['planner_id', 'starts_at'])]
class StudyPlannerEvent extends BaseEntity
{
    public const TYPES = ['college', 'practicum', 'oefenzitting', 'excursie', 'opdracht', 'other'];

    #[ORM\ManyToOne(inversedBy: 'events')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private StudyPlanner $planner;

    /** The feed's UID of the session. */
    #[ORM\Column(type: Types::STRING, length: 255)]
    private string $uid;

    #[ORM\Column(type: Types::DATETIMETZ_IMMUTABLE)]
    private DateTimeImmutable $startsAt;

    #[ORM\Column(type: Types::DATETIMETZ_IMMUTABLE, nullable: true)]
    private ?DateTimeImmutable $endsAt = null;

    /** "H04A9a": the code of the teaching activity, as the timetable gives it. */
    #[ORM\Column(type: Types::STRING, length: 32, nullable: true)]
    private ?string $courseCode = null;

    /** "H04A9a Power System Calculations: Lecture": the summary up to the first comma. */
    #[ORM\Column(type: Types::STRING, length: 500)]
    private string $course;

    #[ORM\Column(type: Types::STRING, length: 500, nullable: true)]
    private ?string $people = null;

    #[ORM\Column(type: Types::STRING, length: 500, nullable: true)]
    private ?string $location = null;

    /** One of self::TYPES. */
    #[ORM\Column(type: Types::STRING, length: 32)]
    private string $type = 'other';

    #[ORM\Column(type: Types::DATETIMETZ_IMMUTABLE)]
    private DateTimeImmutable $firstSeen;

    #[ORM\Column(type: Types::DATETIMETZ_IMMUTABLE, nullable: true)]
    private ?DateTimeImmutable $removedAt = null;

    #[ORM\Column(type: Types::DATETIMETZ_IMMUTABLE, nullable: true)]
    private ?DateTimeImmutable $doneAt = null;

    #[ORM\Column(type: Types::DATETIMETZ_IMMUTABLE, nullable: true)]
    private ?DateTimeImmutable $hiddenAt = null;

    #[ORM\Column(type: Types::DATETIMETZ_IMMUTABLE, nullable: true)]
    private ?DateTimeImmutable $mandatoryAt = null;

    public function __construct(StudyPlanner $planner, string $uid, DateTimeImmutable $firstSeen)
    {
        $this->planner = $planner;
        $this->uid = $uid;
        $this->firstSeen = $firstSeen;
    }

    public function getPlanner(): StudyPlanner
    {
        return $this->planner;
    }

    public function getUid(): string
    {
        return $this->uid;
    }

    public function getStartsAt(): DateTimeImmutable
    {
        return $this->startsAt;
    }

    public function getEndsAt(): ?DateTimeImmutable
    {
        return $this->endsAt;
    }

    public function getCourseCode(): ?string
    {
        return $this->courseCode;
    }

    public function getCourse(): string
    {
        return $this->course;
    }

    public function getPeople(): ?string
    {
        return $this->people;
    }

    public function getLocation(): ?string
    {
        return $this->location;
    }

    public function getType(): string
    {
        return $this->type;
    }

    public function getFirstSeen(): DateTimeImmutable
    {
        return $this->firstSeen;
    }

    /**
     * Takes over what the feed now says about the session.
     */
    public function update(
        DateTimeImmutable $startsAt,
        ?DateTimeImmutable $endsAt,
        ?string $courseCode,
        string $course,
        ?string $people,
        ?string $location,
        string $type,
    ): self {
        // Only assign what changed, so an unchanged session is not written back on every sync.
        if (!isset($this->startsAt) || $this->startsAt != $startsAt) {
            $this->startsAt = $startsAt;
        }
        if ($this->endsAt != $endsAt) {
            $this->endsAt = $endsAt;
        }
        $this->courseCode = $courseCode;
        $this->course = mb_substr($course, 0, 500);
        $this->people = null === $people ? null : mb_substr($people, 0, 500);
        $this->location = null === $location ? null : mb_substr($location, 0, 500);
        $this->type = in_array($type, self::TYPES, true) ? $type : 'other';
        $this->removedAt = null;

        return $this;
    }

    public function getRemovedAt(): ?DateTimeImmutable
    {
        return $this->removedAt;
    }

    public function markRemoved(DateTimeImmutable $at): self
    {
        $this->removedAt = $at;

        return $this;
    }

    public function isDone(): bool
    {
        return null !== $this->doneAt;
    }

    public function setDone(bool $done, DateTimeImmutable $at): self
    {
        $this->doneAt = $done ? ($this->doneAt ?? $at) : null;

        return $this;
    }

    public function isHidden(): bool
    {
        return null !== $this->hiddenAt;
    }

    public function setHidden(bool $hidden, DateTimeImmutable $at): self
    {
        $this->hiddenAt = $hidden ? ($this->hiddenAt ?? $at) : null;

        return $this;
    }

    public function isMandatory(): bool
    {
        return null !== $this->mandatoryAt;
    }

    public function setMandatory(bool $mandatory, DateTimeImmutable $at): self
    {
        $this->mandatoryAt = $mandatory ? ($this->mandatoryAt ?? $at) : null;

        return $this;
    }
}
