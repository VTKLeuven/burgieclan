<?php

namespace App\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * An exam someone put in the "Blok" calendar of their study planner. It belongs to the user, not
 * to their timetable, so it works without one.
 *
 * $subject is "course:12" for a Burgieclan course or "name:Thermal Systems" for a course known only
 * by its name: the same keys StudyPlannerSubjects gives the courses of a timetable. $subjectLabel
 * is the course's name when it was saved.
 */
#[ORM\Entity]
#[ORM\Index(name: 'idx_study_planner_exam_user', columns: ['user_id', 'date'])]
class StudyPlannerExam extends BaseEntity
{
    public const MAX_PER_USER = 100;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private User $user;

    #[ORM\Column(type: Types::STRING, length: 255)]
    private string $subject;

    #[ORM\Column(type: Types::STRING, length: 255)]
    private string $subjectLabel;

    /** "YYYY-MM-DD" in Leuven. */
    #[ORM\Column(type: Types::STRING, length: 10)]
    private string $date;

    /** "HH:MM", or null when not known. */
    #[ORM\Column(type: Types::STRING, length: 5, nullable: true)]
    private ?string $time = null;

    public function __construct(User $user)
    {
        $this->user = $user;
    }

    public function getUser(): User
    {
        return $this->user;
    }

    public function getSubject(): string
    {
        return $this->subject;
    }

    public function getSubjectLabel(): string
    {
        return $this->subjectLabel;
    }

    public function getDate(): string
    {
        return $this->date;
    }

    public function getTime(): ?string
    {
        return $this->time;
    }

    /**
     * The values are validated by StudyPlannerBlok.
     */
    public function fill(string $subject, string $subjectLabel, string $date, ?string $time): self
    {
        $this->subject = $subject;
        $this->subjectLabel = mb_substr($subjectLabel, 0, 255);
        $this->date = $date;
        $this->time = $time;

        return $this;
    }
}
