<?php

namespace App\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * Hides, or marks as mandatory, every session of a weekly slot: the same course, weekday, start
 * time (Leuven wall clock) and room. For a group session that repeats every week, so it does not
 * have to be marked again for each new session the timetable adds.
 */
#[ORM\Entity]
class StudyPlannerRule extends BaseEntity
{
    public const ACTION_HIDE = 'hide';
    public const ACTION_MANDATORY = 'mandatory';

    #[ORM\ManyToOne(inversedBy: 'rules')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private StudyPlanner $planner;

    #[ORM\Column(type: Types::STRING, length: 16)]
    private string $action;

    /** StudyPlannerEvent::$course of the sessions it applies to. */
    #[ORM\Column(type: Types::STRING, length: 500)]
    private string $course;

    /** 0 = Monday ... 6 = Sunday. */
    #[ORM\Column(type: Types::SMALLINT)]
    private int $weekday;

    /** "HH:MM" in Leuven. */
    #[ORM\Column(type: Types::STRING, length: 5)]
    private string $time;

    /** The first line of the sessions' location, or "" for none. */
    #[ORM\Column(type: Types::STRING, length: 500)]
    private string $location;

    public function __construct(StudyPlanner $planner, string $action, string $course, int $weekday, string $time, string $location)
    {
        $this->planner = $planner;
        $this->action = $action;
        $this->course = $course;
        $this->weekday = $weekday;
        $this->time = $time;
        $this->location = $location;
    }

    public function getPlanner(): StudyPlanner
    {
        return $this->planner;
    }

    public function getAction(): string
    {
        return $this->action;
    }

    public function getCourse(): string
    {
        return $this->course;
    }

    public function getWeekday(): int
    {
        return $this->weekday;
    }

    public function getTime(): string
    {
        return $this->time;
    }

    public function getLocation(): string
    {
        return $this->location;
    }

    public function matches(string $action, string $course, int $weekday, string $time, string $location): bool
    {
        return $this->action === $action
            && $this->course === $course
            && $this->weekday === $weekday
            && $this->time === $time
            && $this->location === $location;
    }
}
