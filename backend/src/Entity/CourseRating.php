<?php

namespace App\Entity;

use App\Repository\CourseRatingRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * One student's score for one course on one rated section, e.g. Studiebelasting 4/5.
 *
 * Deliberately not a field on CourseComment. A comment and a rating are different animals: a
 * student writes many comments and each stands on its own, but holds exactly one rating per
 * axis, replaces it rather than adding to it, and it only means anything in aggregate. Bolted
 * onto the comment it would make every row carry a nullable score, force the average to filter
 * nulls, re-rate the course whenever someone edited their text, and require an empty comment
 * from anyone who only wanted to give a score.
 *
 * The vote entities could not be reused either: AbstractVote::setVoteType() rejects anything
 * that is not +1 or -1, and widening it would break every existing up and down vote.
 */
#[ORM\Entity(repositoryClass: CourseRatingRepository::class)]
#[ORM\UniqueConstraint(name: 'unique_rating_per_user_course_category', columns: ['creator_id', 'course_id', 'category_id'])]
class CourseRating extends Node
{
    public const MIN = 1;
    public const MAX = 5;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Course $course;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private CommentCategory $category;

    #[ORM\Column(type: 'smallint')]
    #[Assert\Range(min: self::MIN, max: self::MAX)]
    private int $value;

    /**
     * Which academic year the student is scoring, e.g. "2024 - 2025".
     *
     * Not createdAt. "How was this course in 2024-2025?" is the question a score answers, and
     * somebody rating a course two years after taking it would otherwise drag stale experience
     * into the recent window. Required here, unlike on a comment: a score with no year cannot
     * be placed in or out of that window at all.
     */
    #[ORM\Column(length: 11)]
    #[Assert\Regex(pattern: '/^\d{4} - \d{4}$/')]
    private string $academicYear;

    public function getCourse(): Course
    {
        return $this->course;
    }

    public function setCourse(Course $course): static
    {
        $this->course = $course;

        return $this;
    }

    public function getCategory(): CommentCategory
    {
        return $this->category;
    }

    public function setCategory(CommentCategory $category): static
    {
        $this->category = $category;

        return $this;
    }

    public function getValue(): int
    {
        return $this->value;
    }

    public function setValue(int $value): static
    {
        $this->value = $value;

        return $this;
    }

    public function getAcademicYear(): string
    {
        return $this->academicYear;
    }

    public function setAcademicYear(string $academicYear): static
    {
        $this->academicYear = $academicYear;

        return $this;
    }

    public function __toString(): string
    {
        return sprintf('%d/%d', $this->value, self::MAX);
    }
}
