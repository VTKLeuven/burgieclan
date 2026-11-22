<?php

namespace App\Entity;

use App\Constants\ExchangeTopic;
use App\Repository\ExchangeReportRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * One student's experience at an exchange destination: when they went, in which programme, and a
 * piece of text per topic (ExchangeTopic), plus the courses they took there and what those were
 * recognised as at KU Leuven, and any files they attached (ExchangeReportFile), e.g. their whole
 * course package as one PDF.
 *
 * A report is shown once a moderator has approved it; until then only its author sees it. The
 * author's name is only shown with showName, their e-mail address only with contactable, and
 * both only to signed-in students. A deleted account leaves its reports behind, without a name.
 */
#[ORM\Entity(repositoryClass: ExchangeReportRepository::class)]
#[ORM\Index(name: 'exchange_report_destination_idx', columns: ['destination_id', 'under_review'])]
class ExchangeReport extends BaseEntity
{
    public const PHASES = ['M1', 'M2'];
    /** First semester, second semester, or the whole year. */
    public const PERIODS = ['S1', 'S2', 'J'];

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ExchangeDestination $destination;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?User $author;

    /** The academic year of the exchange, e.g. "2024 - 2025". */
    #[ORM\Column(length: 11)]
    private string $academicYear = '';

    #[ORM\Column(length: 2)]
    private string $phase = 'M1';

    #[ORM\Column(length: 2)]
    private string $period = 'S1';

    /** An ExchangeProgram code. */
    #[ORM\Column(length: 8)]
    private string $program = '';

    /**
     * Text per topic, keyed by ExchangeTopic value. Topics left empty are not stored.
     *
     * @var array<string, string>
     */
    #[ORM\Column(type: Types::JSON, options: ['jsonb' => true])]
    private array $sections = [];

    /**
     * The courses taken at the host: name, code, what they were recognised as, and an opinion.
     * Read through getCourses(), which puts the keys back in order.
     *
     * @var list<array<string, mixed>>
     */
    #[ORM\Column(type: Types::JSON, options: ['jsonb' => true])]
    private array $courses = [];

    /** Whether signed-in students may see the author's e-mail address to ask questions. */
    #[ORM\Column(options: ['default' => false])]
    private bool $contactable = false;

    /** Whether the author's name is shown; otherwise only programme, phase and year. */
    #[ORM\Column(options: ['default' => false])]
    private bool $showName = false;

    #[ORM\Column(options: ['default' => true])]
    private bool $underReview = true;

    /**
     * For reports imported from the old VTK wiki (`app:exchange:import-wiki`), which have no
     * account behind them: the name and address the student put on the wiki themselves.
     */
    #[ORM\Column(length: 120, nullable: true)]
    private ?string $legacyAuthorName = null;

    #[ORM\Column(length: 180, nullable: true)]
    private ?string $legacyContactEmail = null;

    /** @var Collection<int, ExchangeReportFile> */
    #[ORM\OneToMany(targetEntity: ExchangeReportFile::class, mappedBy: 'report', cascade: ['persist', 'remove'], orphanRemoval: true)]
    #[ORM\OrderBy(['id' => 'ASC'])]
    private Collection $files;

    public function __construct(ExchangeDestination $destination, ?User $author)
    {
        $this->destination = $destination;
        $this->author = $author;
        $this->files = new ArrayCollection();
    }

    /** @return Collection<int, ExchangeReportFile> */
    public function getFiles(): Collection
    {
        return $this->files;
    }

    public function addFile(ExchangeReportFile $file): static
    {
        if (!$this->files->contains($file)) {
            $this->files->add($file);
        }

        return $this;
    }

    public function removeFile(ExchangeReportFile $file): static
    {
        $this->files->removeElement($file);

        return $this;
    }

    public function getDestination(): ExchangeDestination
    {
        return $this->destination;
    }

    public function setDestination(ExchangeDestination $destination): static
    {
        $this->destination = $destination;

        return $this;
    }

    public function getAuthor(): ?User
    {
        return $this->author;
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

    public function getPhase(): string
    {
        return $this->phase;
    }

    public function setPhase(string $phase): static
    {
        $this->phase = $phase;

        return $this;
    }

    public function getPeriod(): string
    {
        return $this->period;
    }

    public function setPeriod(string $period): static
    {
        $this->period = $period;

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

    /**
     * In the order of ExchangeTopic: jsonb keeps keys in an order of its own.
     *
     * @return array<string, string>
     */
    public function getSections(): array
    {
        $ordered = [];
        foreach (ExchangeTopic::cases() as $topic) {
            if (isset($this->sections[$topic->value])) {
                $ordered[$topic->value] = $this->sections[$topic->value];
            }
        }

        return $ordered;
    }

    /**
     * Keeps the known topics that have text, in the order of ExchangeTopic.
     *
     * @param array<string, string> $sections
     */
    public function setSections(array $sections): static
    {
        $kept = [];
        foreach (ExchangeTopic::cases() as $topic) {
            $text = trim((string) ($sections[$topic->value] ?? ''));
            if ('' !== $text) {
                $kept[$topic->value] = $text;
            }
        }
        $this->sections = $kept;

        return $this;
    }

    public function getSection(ExchangeTopic $topic): ?string
    {
        return $this->sections[$topic->value] ?? null;
    }

    public function setSection(ExchangeTopic $topic, ?string $text): static
    {
        return $this->setSections([$topic->value => $text ?? ''] + $this->getSections());
    }

    /**
     * @return list<array{name: string, code: string, equivalent: string, text: string}>
     */
    public function getCourses(): array
    {
        // jsonb keeps keys in an order of its own; this is the order they are written in.
        return array_map(
            static fn (array $course): array => [
                'name' => (string) ($course['name'] ?? ''),
                'code' => (string) ($course['code'] ?? ''),
                'equivalent' => (string) ($course['equivalent'] ?? ''),
                'text' => (string) ($course['text'] ?? ''),
            ],
            $this->courses
        );
    }

    /**
     * @param list<array{name: string, code: string, equivalent: string, text: string}> $courses
     */
    public function setCourses(array $courses): static
    {
        $this->courses = $courses;

        return $this;
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

    public function getLegacyAuthorName(): ?string
    {
        return $this->legacyAuthorName;
    }

    public function setLegacyAuthorName(?string $legacyAuthorName): static
    {
        $this->legacyAuthorName = $legacyAuthorName;

        return $this;
    }

    public function getLegacyContactEmail(): ?string
    {
        return $this->legacyContactEmail;
    }

    public function setLegacyContactEmail(?string $legacyContactEmail): static
    {
        $this->legacyContactEmail = $legacyContactEmail;

        return $this;
    }

    /** The name shown with the report, if any. */
    public function displayName(): ?string
    {
        return $this->legacyAuthorName ?? ($this->showName ? $this->author?->getFullName() : null);
    }

    /** The address signed-in students may write to, if the author allows it. */
    public function contactEmail(): ?string
    {
        return $this->legacyContactEmail ?? ($this->contactable ? $this->author?->getEmail() : null);
    }

    // One pair per topic, so the admin can edit each text in its own field.

    public function getGeneralText(): ?string
    {
        return $this->getSection(ExchangeTopic::GENERAL);
    }

    public function setGeneralText(?string $text): static
    {
        return $this->setSection(ExchangeTopic::GENERAL, $text);
    }

    public function getEducationText(): ?string
    {
        return $this->getSection(ExchangeTopic::EDUCATION);
    }

    public function setEducationText(?string $text): static
    {
        return $this->setSection(ExchangeTopic::EDUCATION, $text);
    }

    public function getHousingText(): ?string
    {
        return $this->getSection(ExchangeTopic::HOUSING);
    }

    public function setHousingText(?string $text): static
    {
        return $this->setSection(ExchangeTopic::HOUSING, $text);
    }

    public function getLifeText(): ?string
    {
        return $this->getSection(ExchangeTopic::LIFE);
    }

    public function setLifeText(?string $text): static
    {
        return $this->setSection(ExchangeTopic::LIFE, $text);
    }

    public function getTransportText(): ?string
    {
        return $this->getSection(ExchangeTopic::TRANSPORT);
    }

    public function setTransportText(?string $text): static
    {
        return $this->setSection(ExchangeTopic::TRANSPORT, $text);
    }

    public function getOtherText(): ?string
    {
        return $this->getSection(ExchangeTopic::OTHER);
    }

    public function setOtherText(?string $text): static
    {
        return $this->setSection(ExchangeTopic::OTHER, $text);
    }

    /** The courses as plain text, one per line, for the admin. */
    public function getCoursesSummary(): string
    {
        return implode(
            "\n",
            array_map(
                static fn (array $course): string => sprintf(
                    '%s%s → %s%s',
                    $course['name'],
                    '' !== $course['code'] ? ' (' . $course['code'] . ')' : '',
                    '' !== $course['equivalent'] ? $course['equivalent'] : '?',
                    '' !== $course['text'] ? ': ' . $course['text'] : ''
                ),
                $this->getCourses()
            )
        );
    }

    public function __toString(): string
    {
        return trim(sprintf('%s · %s · %s %s', $this->destination->getName(), $this->academicYear, $this->phase, $this->program));
    }
}
