<?php

namespace App\Entity;

use App\Repository\AthensCourseRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * A course in the faculty's ATHENS catalogue, with the study fields it got a positive advice
 * for. Only those count for an application.
 *
 * The catalogue changes every year. Courses that drop out are not deleted but made inactive:
 * they disappear from the site while their reviews stay, so a course that comes back a few years
 * later has them again. See AthensCatalogue for how a course in a new catalogue is recognised.
 */
#[ORM\Entity(repositoryClass: AthensCourseRepository::class)]
#[ORM\Index(name: 'athens_course_active_idx', columns: ['active'])]
class AthensCourse extends BaseEntity
{
    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private AthensUniversity $university;

    /** As the catalogue writes it, e.g. "UPM188" or "ITU14/TUD24" (given by two universities together). */
    #[ORM\Column(length: 40)]
    private string $code = '';

    #[ORM\Column(length: 255)]
    private string $title = '';

    /** How it is evaluated, e.g. "Written exam" or "Group project". */
    #[ORM\Column(length: 80)]
    private string $evaluation = '';

    /**
     * The ExchangeProgram codes with a positive advice.
     *
     * @var list<string>
     */
    #[ORM\Column(type: Types::JSON, options: ['jsonb' => true])]
    private array $programs = [];

    /** In the current catalogue. */
    #[ORM\Column(options: ['default' => true])]
    private bool $active = true;

    /** The catalogues it was first and last in, e.g. "2026-2027". */
    #[ORM\Column(length: 9)]
    private string $firstEdition = '';

    #[ORM\Column(length: 9)]
    private string $lastEdition = '';

    /** Its page on the ATHENS registration platform (AthensRegister::courseUrl()), once it has been on the list there. */
    #[ORM\Column(nullable: true)]
    private ?int $registerId = null;

    /**
     * What its page on the registration platform said the last time it was on the list there:
     * "session" (YYYY-MM), "fetched", and the fields of AthensRegister::FIELDS plus "categories".
     *
     * @var array<string, mixed>|null
     */
    #[ORM\Column(type: Types::JSON, nullable: true, options: ['jsonb' => true])]
    private ?array $registerInfo = null;

    /** On the registration platform's list of the session that is open now (register.json). */
    #[ORM\Column(options: ['default' => false])]
    private bool $onRegister = false;

    public function __construct(AthensUniversity $university)
    {
        $this->university = $university;
    }

    public function getUniversity(): AthensUniversity
    {
        return $this->university;
    }

    public function getCode(): string
    {
        return $this->code;
    }

    public function setCode(string $code): static
    {
        $this->code = $code;

        return $this;
    }

    public function getTitle(): string
    {
        return $this->title;
    }

    public function setTitle(string $title): static
    {
        $this->title = $title;

        return $this;
    }

    public function getEvaluation(): string
    {
        return $this->evaluation;
    }

    public function setEvaluation(string $evaluation): static
    {
        $this->evaluation = $evaluation;

        return $this;
    }

    /** @return list<string> */
    public function getPrograms(): array
    {
        return $this->programs;
    }

    /** @param list<string> $programs */
    public function setPrograms(array $programs): static
    {
        $this->programs = $programs;

        return $this;
    }

    public function isActive(): bool
    {
        return $this->active;
    }

    public function setActive(bool $active): static
    {
        $this->active = $active;

        return $this;
    }

    public function getFirstEdition(): string
    {
        return $this->firstEdition;
    }

    public function setFirstEdition(string $firstEdition): static
    {
        $this->firstEdition = $firstEdition;

        return $this;
    }

    public function getLastEdition(): string
    {
        return $this->lastEdition;
    }

    public function setLastEdition(string $lastEdition): static
    {
        $this->lastEdition = $lastEdition;

        return $this;
    }

    public function getRegisterId(): ?int
    {
        return $this->registerId;
    }

    public function setRegisterId(?int $registerId): static
    {
        $this->registerId = $registerId;

        return $this;
    }

    /** @return array<string, mixed>|null */
    public function getRegisterInfo(): ?array
    {
        return $this->registerInfo;
    }

    /** @param array<string, mixed>|null $registerInfo */
    public function setRegisterInfo(?array $registerInfo): static
    {
        $this->registerInfo = $registerInfo;

        return $this;
    }

    public function isOnRegister(): bool
    {
        return $this->onRegister;
    }

    public function setOnRegister(bool $onRegister): static
    {
        $this->onRegister = $onRegister;

        return $this;
    }

    /** The advice as text, for the admin. */
    public function getProgramsSummary(): string
    {
        return implode(', ', $this->programs);
    }

    public function __toString(): string
    {
        return sprintf('%s · %s (%s)', $this->code, $this->title, $this->university->getName());
    }
}
