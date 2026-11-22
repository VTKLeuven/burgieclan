<?php

namespace App\Entity;

use App\Constants\AthensTopic;
use App\Repository\AthensReviewRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * One student's review of an ATHENS course they took: the session, their programme, a score out
 * of five and a piece of text per topic (AthensTopic).
 *
 * Like an exchange report, it is shown once a moderator has approved it; until then only its
 * author sees it. The name and e-mail address only show when the author chose so. It stays when
 * its course leaves the catalogue.
 */
#[ORM\Entity(repositoryClass: AthensReviewRepository::class)]
#[ORM\Index(name: 'athens_review_course_idx', columns: ['course_id', 'under_review'])]
class AthensReview extends BaseEntity
{
    public const MIN_RATING = 1;
    public const MAX_RATING = 5;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private AthensCourse $course;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?User $author;

    /** The ATHENS week, as year and month: "2025-11" or "2026-03". */
    #[ORM\Column(name: 'athens_session', length: 7)]
    private string $session = '';

    /** An ExchangeProgram code. */
    #[ORM\Column(length: 8)]
    private string $program = '';

    /** Would you recommend it, from 1 to 5. */
    #[ORM\Column(type: Types::SMALLINT)]
    private int $rating = 3;

    /**
     * Text per topic, keyed by AthensTopic value. Topics left empty are not stored.
     *
     * @var array<string, string>
     */
    #[ORM\Column(type: Types::JSON, options: ['jsonb' => true])]
    private array $sections = [];

    #[ORM\Column(options: ['default' => false])]
    private bool $contactable = false;

    #[ORM\Column(options: ['default' => false])]
    private bool $showName = false;

    #[ORM\Column(options: ['default' => true])]
    private bool $underReview = true;

    public function __construct(AthensCourse $course, ?User $author)
    {
        $this->course = $course;
        $this->author = $author;
    }

    public function getCourse(): AthensCourse
    {
        return $this->course;
    }

    public function setCourse(AthensCourse $course): static
    {
        $this->course = $course;

        return $this;
    }

    public function getAuthor(): ?User
    {
        return $this->author;
    }

    public function getSession(): string
    {
        return $this->session;
    }

    public function setSession(string $session): static
    {
        $this->session = $session;

        return $this;
    }

    public function getProgram(): string
    {
        return $this->program;
    }

    public function setProgram(string $program): static
    {
        $this->program = $program;

        return $this;
    }

    public function getRating(): int
    {
        return $this->rating;
    }

    public function setRating(int $rating): static
    {
        $this->rating = max(self::MIN_RATING, min(self::MAX_RATING, $rating));

        return $this;
    }

    /**
     * In the order of AthensTopic: jsonb keeps keys in an order of its own.
     *
     * @return array<string, string>
     */
    public function getSections(): array
    {
        $ordered = [];
        foreach (AthensTopic::cases() as $topic) {
            if (isset($this->sections[$topic->value])) {
                $ordered[$topic->value] = $this->sections[$topic->value];
            }
        }

        return $ordered;
    }

    /**
     * Keeps the known topics that have text.
     *
     * @param array<string, string> $sections
     */
    public function setSections(array $sections): static
    {
        $kept = [];
        foreach (AthensTopic::cases() as $topic) {
            $text = trim((string) ($sections[$topic->value] ?? ''));
            if ('' !== $text) {
                $kept[$topic->value] = $text;
            }
        }
        $this->sections = $kept;

        return $this;
    }

    public function getSection(AthensTopic $topic): ?string
    {
        return $this->sections[$topic->value] ?? null;
    }

    public function setSection(AthensTopic $topic, ?string $text): static
    {
        return $this->setSections([$topic->value => $text ?? ''] + $this->getSections());
    }

    public function isContactable(): bool
    {
        return $this->contactable;
    }

    public function setContactable(bool $contactable): static
    {
        $this->contactable = $contactable;

        return $this;
    }

    public function isShowName(): bool
    {
        return $this->showName;
    }

    public function setShowName(bool $showName): static
    {
        $this->showName = $showName;

        return $this;
    }

    public function isUnderReview(): bool
    {
        return $this->underReview;
    }

    public function setUnderReview(bool $underReview): static
    {
        $this->underReview = $underReview;

        return $this;
    }

    public function displayName(): ?string
    {
        return $this->showName ? $this->author?->getFullName() : null;
    }

    public function contactEmail(): ?string
    {
        return $this->contactable ? $this->author?->getEmail() : null;
    }

    // One pair per topic, so the admin can edit each text in its own field.

    public function getCourseText(): ?string
    {
        return $this->getSection(AthensTopic::COURSE);
    }

    public function setCourseText(?string $text): static
    {
        return $this->setSection(AthensTopic::COURSE, $text);
    }

    public function getExamText(): ?string
    {
        return $this->getSection(AthensTopic::EXAM);
    }

    public function setExamText(?string $text): static
    {
        return $this->setSection(AthensTopic::EXAM, $text);
    }

    public function getCityText(): ?string
    {
        return $this->getSection(AthensTopic::CITY);
    }

    public function setCityText(?string $text): static
    {
        return $this->setSection(AthensTopic::CITY, $text);
    }

    public function getPracticalText(): ?string
    {
        return $this->getSection(AthensTopic::PRACTICAL);
    }

    public function setPracticalText(?string $text): static
    {
        return $this->setSection(AthensTopic::PRACTICAL, $text);
    }

    public function __toString(): string
    {
        return sprintf('%s · %s · %s', $this->course->getTitle(), $this->session, $this->program);
    }
}
