<?php

namespace App\Entity;

use App\Constants\ExchangeProgram;
use App\Repository\ExchangeDestinationRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * A university students can go to on exchange, with the reports of those who went there.
 *
 * The faculty's own lists are loaded by `app:exchange:seed-destinations`; students add the ones
 * that are missing while writing a report. Those start unapproved and are only listed once a
 * moderator approves them, though their author already sees them.
 */
#[ORM\Entity(repositoryClass: ExchangeDestinationRepository::class)]
#[ORM\UniqueConstraint(name: 'exchange_destination_name_unique', columns: ['name'])]
class ExchangeDestination extends BaseEntity
{
    /** How the exchange is arranged, from the country (see scheme()). */
    public const SCHEME_ERASMUS = 'erasmus';
    public const SCHEME_SEMP = 'semp';
    public const SCHEME_BILATERAL = 'bilateral';
    public const SCHEME_BELGIUM = 'belgium';

    /** Where a destination comes from: the faculty's lists, the old VTK wiki, or a student. */
    public const SOURCE_FACULTY = 'faculty';
    public const SOURCE_WIKI = 'wiki';
    public const SOURCE_STUDENT = 'student';

    /**
     * Where Erasmus+ applies: the EU, the associated countries, and the United Kingdom, which the
     * faculty still lists among its Erasmus destinations.
     */
    private const ERASMUS_COUNTRIES = [
        'AT', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'HU', 'IE', 'IT', 'LT', 'LU',
        'LV', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK', 'IS', 'LI', 'NO', 'MK', 'RS', 'TR', 'GB',
    ];

    #[ORM\Column(length: 160)]
    private string $name = '';

    #[ORM\Column(length: 100)]
    private string $city = '';

    /** ISO 3166-1 alpha-2, upper case. The frontend names the country in the reader's language. */
    #[ORM\Column(length: 2)]
    private string $country = '';

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $website = null;

    /**
     * The programmes (ExchangeProgram codes) this university is listed for. Empty with allPrograms
     * off means nobody knows yet; students suggest programmes (ExchangeProgramSuggestion).
     *
     * @var list<string>
     */
    #[ORM\Column(type: Types::JSON, options: ['jsonb' => true])]
    private array $programs = [];

    /** Open to every programme, as most universities on the faculty's list outside Europe. */
    #[ORM\Column(options: ['default' => false])]
    private bool $allPrograms = false;

    #[ORM\Column(length: 16, options: ['default' => self::SOURCE_FACULTY])]
    private string $source = self::SOURCE_FACULTY;

    #[ORM\Column(options: ['default' => true])]
    private bool $approved = true;

    /** Who added it from the report form; null for the faculty's own destinations. */
    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?User $suggestedBy = null;

    public function getName(): string
    {
        return $this->name;
    }

    public function setName(string $name): static
    {
        $this->name = trim($name);

        return $this;
    }

    public function getCity(): string
    {
        return $this->city;
    }

    public function setCity(string $city): static
    {
        $this->city = trim($city);

        return $this;
    }

    public function getCountry(): string
    {
        return $this->country;
    }

    public function setCountry(string $country): static
    {
        $this->country = strtoupper(trim($country));

        return $this;
    }

    public function getWebsite(): ?string
    {
        return $this->website;
    }

    public function setWebsite(?string $website): static
    {
        $website = null === $website ? null : trim($website);
        $this->website = '' === $website ? null : $website;

        return $this;
    }

    /**
     * @return list<string>
     */
    public function getPrograms(): array
    {
        return $this->programs;
    }

    /**
     * Unknown codes are dropped and the rest kept in the order of ExchangeProgram.
     *
     * @param array<string> $programs
     */
    public function setPrograms(array $programs): static
    {
        $this->programs = array_values(
            array_map(
                static fn (ExchangeProgram $program): string => $program->value,
                array_filter(
                    ExchangeProgram::cases(),
                    static fn (ExchangeProgram $program): bool => in_array($program->value, $programs, true)
                )
            )
        );

        return $this;
    }

    public function isAllPrograms(): bool
    {
        return $this->allPrograms;
    }

    public function setAllPrograms(bool $allPrograms): static
    {
        $this->allPrograms = $allPrograms;

        return $this;
    }

    public function getSource(): string
    {
        return $this->source;
    }

    public function setSource(string $source): static
    {
        $this->source = $source;

        return $this;
    }

    public function isApproved(): bool
    {
        return $this->approved;
    }

    public function setApproved(bool $approved): static
    {
        $this->approved = $approved;

        return $this;
    }

    public function getSuggestedBy(): ?User
    {
        return $this->suggestedBy;
    }

    public function setSuggestedBy(?User $suggestedBy): static
    {
        $this->suggestedBy = $suggestedBy;

        return $this;
    }

    public function scheme(): string
    {
        return match (true) {
            'CH' === $this->country => self::SCHEME_SEMP,
            'BE' === $this->country => self::SCHEME_BELGIUM,
            in_array($this->country, self::ERASMUS_COUNTRIES, true) => self::SCHEME_ERASMUS,
            default => self::SCHEME_BILATERAL,
        };
    }

    public function __toString(): string
    {
        return sprintf('%s (%s)', $this->name, $this->city);
    }
}
