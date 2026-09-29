<?php

namespace App\Entity;

use App\Constants\ExamPeriod;
use App\Repository\ExamRepository;
use DateTimeImmutable;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use LogicException;

/**
 * An exam reconstruction: students rebuilding one exam together after they took it.
 *
 * There is exactly one per course, academic year and exam period. The questions themselves are
 * not stored here but in a live document on the collab server (CollabDocument), named after this
 * exam: "exam-{id}". Inside that document students add the days the exam was given on and mark
 * on each question which days it came up.
 *
 * Everyone who is logged in may edit it until `editableUntil`; after that it is read-only
 * (CollabDocumentVoter). Moderators move that date to lock or reopen it.
 *
 * Not a Node, although it has a creator: a Node is deleted together with its creator's account,
 * and a reconstruction is the work of everyone who edited it, not only of whoever started it.
 */
#[ORM\Entity(repositoryClass: ExamRepository::class)]
#[ORM\UniqueConstraint(name: 'uniq_exam_course_year_period', columns: ['course_id', 'academic_year', 'period'])]
class Exam extends BaseEntity
{
    public const DOCUMENT_PREFIX = 'exam-';

    /** How long a reconstruction stays open after its exam period ends, or after it was started. */
    public const EDITABLE_FOR = '+14 days';

    /** Who started it. Null once their account is deleted. */
    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?User $creator;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Course $course;

    /** E.g. "2025 - 2026". */
    #[ORM\Column(length: 11)]
    private string $academicYear;

    #[ORM\Column(length: 16, enumType: ExamPeriod::class)]
    private ExamPeriod $period;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private DateTimeImmutable $editableUntil;

    /** The reconstruction this one started as a copy of, e.g. January's when June reused it. */
    #[ORM\ManyToOne(targetEntity: self::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Exam $copiedFrom = null;

    public function __construct(User $creator, Course $course, string $academicYear, ExamPeriod $period)
    {
        $this->creator = $creator;
        $this->course = $course;
        $this->academicYear = $academicYear;
        $this->period = $period;
        $this->editableUntil = self::defaultEditableUntil($period, $academicYear);
    }

    /**
     * Two weeks after the exam period ends. A reconstruction started later than that, say for an
     * old exam, gets two weeks from when it was started instead, so it is not locked on arrival.
     */
    public static function defaultEditableUntil(
        ExamPeriod $period,
        string $academicYear,
        ?DateTimeImmutable $now = null
    ): DateTimeImmutable {
        $afterPeriod = $period->endsOn($academicYear)->modify(self::EDITABLE_FOR);
        $afterStart = ($now ?? new DateTimeImmutable())->modify(self::EDITABLE_FOR);

        return max($afterPeriod, $afterStart);
    }

    /**
     * The name of the live document holding the questions, e.g. "exam-12".
     */
    public function getDocumentName(): string
    {
        if (null === $this->id) {
            throw new LogicException('An exam has no document before it is stored.');
        }

        return self::DOCUMENT_PREFIX . $this->id;
    }

    /**
     * The exam id in a document name like "exam-12", or null if it is not an exam document.
     */
    public static function idFromDocumentName(string $name): ?int
    {
        if (1 !== preg_match('/^' . self::DOCUMENT_PREFIX . '([1-9]\d{0,17})$/', $name, $matches)) {
            return null;
        }

        return (int) $matches[1];
    }

    public function isEditable(?DateTimeImmutable $now = null): bool
    {
        return ($now ?? new DateTimeImmutable()) < $this->editableUntil;
    }

    public function getCreator(): ?User
    {
        return $this->creator;
    }

    public function getCourse(): Course
    {
        return $this->course;
    }

    public function getAcademicYear(): string
    {
        return $this->academicYear;
    }

    public function getPeriod(): ExamPeriod
    {
        return $this->period;
    }

    public function getEditableUntil(): DateTimeImmutable
    {
        return $this->editableUntil;
    }

    public function setEditableUntil(DateTimeImmutable $editableUntil): static
    {
        $this->editableUntil = $editableUntil;

        return $this;
    }

    public function getCopiedFrom(): ?Exam
    {
        return $this->copiedFrom;
    }

    public function setCopiedFrom(?Exam $copiedFrom): static
    {
        $this->copiedFrom = $copiedFrom;

        return $this;
    }

    public function __toString(): string
    {
        return sprintf('%s, %s %s', $this->course->getCode(), $this->period->value, $this->academicYear);
    }
}
