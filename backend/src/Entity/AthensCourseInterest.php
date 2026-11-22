<?php

namespace App\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * How much a student would like to take an ATHENS course, from 1 to 5 stars: a private note for
 * choosing the three or more courses of an application. Only that student ever sees it; it is
 * never counted or shown to anyone else. Kept when the course leaves the catalogue.
 */
#[ORM\Entity]
#[ORM\UniqueConstraint(name: 'athens_course_interest_unique', columns: ['user_id', 'course_id'])]
class AthensCourseInterest extends BaseEntity
{
    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private User $user;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private AthensCourse $course;

    #[ORM\Column(type: Types::SMALLINT)]
    private int $stars;

    public function __construct(User $user, AthensCourse $course, int $stars)
    {
        $this->user = $user;
        $this->course = $course;
        $this->stars = $stars;
    }

    public function getUser(): User
    {
        return $this->user;
    }

    public function getCourse(): AthensCourse
    {
        return $this->course;
    }

    public function getStars(): int
    {
        return $this->stars;
    }

    public function setStars(int $stars): static
    {
        $this->stars = $stars;

        return $this;
    }
}
