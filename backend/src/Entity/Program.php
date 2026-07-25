<?php

namespace App\Entity;

use App\Repository\ProgramRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ProgramRepository::class)]
#[ORM\UniqueConstraint(name: 'uniq_program_kul_id', columns: ['kul_id'])]
class Program extends BaseEntity
{
    #[ORM\Column(length: 255)]
    private string $name;

    /**
     * KU Leuven onderwijsaanbod identifier (programId), used to match this program
     * when (re-)importing from the KU Leuven data services. Null for manually created programs.
     */
    #[ORM\Column(length: 255, nullable: true)]
    private ?string $kulId = null;

    /**
     * @var Collection<int, Module>
     */
    #[ORM\OneToMany(mappedBy: 'program', targetEntity: Module::class)]
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
}
