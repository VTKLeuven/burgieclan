<?php

namespace App\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * A day someone keeps free in the "Blok" calendar of their study planner.
 */
#[ORM\Entity]
#[ORM\UniqueConstraint(name: 'uniq_study_planner_free_day', columns: ['user_id', 'date'])]
class StudyPlannerFreeDay extends BaseEntity
{
    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private User $user;

    /** "YYYY-MM-DD" in Leuven. */
    #[ORM\Column(type: Types::STRING, length: 10)]
    private string $date;

    public function __construct(User $user, string $date)
    {
        $this->user = $user;
        $this->date = $date;
    }

    public function getUser(): User
    {
        return $this->user;
    }

    public function getDate(): string
    {
        return $this->date;
    }
}
