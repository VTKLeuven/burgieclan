<?php

namespace App\Entity;

use App\Repository\ProgramRepository;
use App\Service\Onderwijsaanbod\ProgramTreeMapper;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ProgramRepository::class)]
#[ORM\UniqueConstraint(name: 'uniq_program_kul_id', columns: ['kul_id'])]
class Program extends BaseEntity
{
    /** @var list<string> Default module names to flatten during import. */
    public const DEFAULT_FLATTEN = ['Verplichte opleidingsonderdelen', 'Compulsory courses'];

    /** @var list<string> The languages a programme may be taught in. */
    public const LANGUAGES = ['nl', 'en'];

    public const DEFAULT_LANGUAGE = 'nl';

    #[ORM\Column(length: 255)]
    private string $name;

    /**
     * The language this programme is taught in, and therefore the language its course titles are
     * shown in — independent of the language a visitor is browsing the site in. A Dutch programme
     * lists Dutch titles to an English-speaking reader, because that is what those courses are
     * actually called.
     *
     * Denormalized from importSettings['lang'], which is the *import parameter* (which language to
     * fetch from KU Leuven). This column is the programme's own property: it is what the API and
     * the curriculum navigator read, it can be filtered and indexed, and it can be corrected
     * without touching import settings. setImportSettings() keeps the two in step.
     */
    #[ORM\Column(length: 2, options: ['default' => self::DEFAULT_LANGUAGE])]
    private string $language = self::DEFAULT_LANGUAGE;

    /**
     * KU Leuven onderwijsaanbod identifier (programId), used to match this program
     * when (re-)importing from the KU Leuven data services. Null for manually created programs.
     */
    #[ORM\Column(length: 255, nullable: true)]
    private ?string $kulId = null;

    /**
     * Saved import/sync settings (e.g. lang, flatten, semester, semesterFlat, merge, enrich).
     *
     * @var array<string, mixed>|null
     */
    #[ORM\Column(type: Types::JSON, nullable: true)]
    private ?array $importSettings = null;

    /**
     * @var Collection<int, Module>
     */
    #[ORM\OneToMany(mappedBy: 'program', targetEntity: Module::class)]
    #[ORM\OrderBy(['position' => 'ASC', 'name' => 'ASC'])]
    private Collection $modules;

    public function __construct()
    {
        $this->modules = new ArrayCollection();
    }

    public function __toString(): string
    {
        return $this->getName();
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function setName(string $name): self
    {
        $this->name = $name;

        return $this;
    }

    public function getKulId(): ?string
    {
        return $this->kulId;
    }

    public function setKulId(?string $kulId): self
    {
        $this->kulId = $kulId;

        return $this;
    }

    /**
     * @return Collection<int, Module>
     */
    public function getModules(): Collection
    {
        return $this->modules;
    }

    public function addModule(Module $module): self
    {
        if (!$this->modules->contains($module)) {
            $this->modules->add($module);
            $module->setProgram($this);
        }

        return $this;
    }

    public function removeModule(Module $module): self
    {
        if ($this->modules->removeElement($module)) {
            // set the owning side to null (unless already changed)
            if ($module->getProgram() === $this) {
                $module->setProgram(null);
            }
        }

        return $this;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function getImportSettings(): ?array
    {
        return $this->importSettings;
    }

    /**
     * @param array<string, mixed>|null $importSettings
     */
    public function setImportSettings(?array $importSettings): self
    {
        $this->importSettings = $importSettings;
        // Keep the denormalized column in step. Done here rather than at the call site because this
        // is the only write path, so there is nowhere for the two to drift apart.
        $this->language = $this->getResolvedImportSettings()['lang'];

        return $this;
    }

    public function getLanguage(): string
    {
        return $this->language;
    }

    /**
     * Correcting a programme's language fixes its course titles immediately, because every course
     * stores both nameNl and nameEn (@see ProgramTreeMapper::toCourse()) and the navigator simply
     * picks by this value. Module names are not translated that way — they carry a single name in
     * whichever language they were imported — so the import parameter is moved along with it, and
     * the next Quick Sync re-fetches module names in the corrected language too.
     */
    public function setLanguage(string $language): self
    {
        $language = in_array($language, self::LANGUAGES, true) ? $language : self::DEFAULT_LANGUAGE;
        $this->language = $language;

        // Written straight to the array rather than via setImportSettings(), which would call back
        // into this method.
        $settings = $this->importSettings ?? [];
        $settings['lang'] = $language;
        $this->importSettings = $settings;

        return $this;
    }

    /**
     * Return saved import settings with defaults applied for any missing keys.
     *
     * @return array{
     *     lang: 'nl'|'en',
     *     flatten: list<string>,
     *     semester: list<string>,
     *     semesterFlat: list<string>,
     *     merge: bool,
     *     enrich: bool,
     *     electiveGrouping: string,
     * }
     */
    public function getResolvedImportSettings(): array
    {
        $s = $this->importSettings ?? [];

        /** @var 'nl'|'en' $lang */
        $lang = ($s['lang'] ?? 'nl') === 'en' ? 'en' : 'nl';
        /** @var list<string> $flatten */
        $flatten = is_array($s['flatten'] ?? null) ? $s['flatten'] : self::DEFAULT_FLATTEN;
        /** @var list<string> $semester */
        $semester = is_array($s['semester'] ?? null) ? $s['semester'] : [];
        /** @var list<string> $semesterFlat */
        $semesterFlat = is_array($s['semesterFlat'] ?? null) ? $s['semesterFlat'] : [];

        return [
            'lang' => $lang,
            'flatten' => $flatten,
            'semester' => $semester,
            'semesterFlat' => $semesterFlat,
            'merge' => (bool) ($s['merge'] ?? true),
            'enrich' => (bool) ($s['enrich'] ?? true),
            'electiveGrouping' => in_array($s['electiveGrouping'] ?? null, ProgramTreeMapper::ELECTIVE_GROUPINGS, true)
                ? (string) $s['electiveGrouping']
                : ProgramTreeMapper::ELECTIVES_PER_TRACK,
        ];
    }
}
