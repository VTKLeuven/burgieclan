<?php

namespace App\Entity;

use App\Repository\ProgramRepository;
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

    #[ORM\Column(length: 255)]
    private string $name;

    /**
     * KU Leuven onderwijsaanbod identifier (programId), used to match this program
     * when (re-)importing from the KU Leuven data services. Null for manually created programs.
     */
    #[ORM\Column(length: 255, nullable: true)]
    private ?string $kulId = null;

    /**
     * Saved import/sync settings (e.g. lang, flatten, semester, merge, enrich).
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

        return $this;
    }

    /**
     * Return saved import settings with defaults applied for any missing keys.
     *
     * @return array{lang: 'nl'|'en', flatten: list<string>, semester: list<string>, merge: bool, enrich: bool}
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

        return [
            'lang' => $lang,
            'flatten' => $flatten,
            'semester' => $semester,
            'merge' => (bool) ($s['merge'] ?? true),
            'enrich' => (bool) ($s['enrich'] ?? true),
        ];
    }
}
