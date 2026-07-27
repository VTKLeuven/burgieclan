<?php

namespace App\Entity;

use App\Repository\ModuleRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ModuleRepository::class)]
#[ORM\Index(name: 'idx_module_kul_id', columns: ['kul_id'])]
class Module extends BaseEntity
{
    #[ORM\Column(length: 255)]
    private string $name;

    /**
     * KU Leuven onderwijsaanbod identifier used to match this module when (re-)importing.
     * In "named" grouping this is the KU Leuven moduleGroupId; in "stage" grouping it is a
     * synthetic key like "stage:<programId>:<n>". Null for manually created modules, which
     * the importer never touches.
     */
    #[ORM\Column(length: 255, nullable: true)]
    private ?string $kulId = null;

    /**
     * Sort order of this module among its siblings (the children of one parent module, or the
     * top-level modules of a program). Lower comes first; ties break on name. Editable from the
     * program structure tree editor so admins can arrange modules in a meaningful order.
     */
    #[ORM\Column(type: Types::INTEGER, options: ['default' => 0])]
    private int $position = 0;

    /**
     * @var Collection<int, Course>
     */
    #[ORM\ManyToMany(targetEntity: Course::class, inversedBy: 'modules')]
    private Collection $courses;

    #[ORM\ManyToOne(inversedBy: 'modules')]
    #[ORM\JoinColumn(nullable: true)]
    private ?Program $program = null;

    /**
     * @var Collection<int, Module>
     */
    #[ORM\ManyToMany(targetEntity: self::class, inversedBy: 'modules')]
    #[ORM\OrderBy(['position' => 'ASC', 'name' => 'ASC'])]
    private Collection $modules;

    public function __construct()
    {
        $this->courses = new ArrayCollection();
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

    public function getPosition(): int
    {
        return $this->position;
    }

    public function setPosition(int $position): self
    {
        $this->position = $position;

        return $this;
    }

    /**
     * @return Collection<int, Course>
     */
    public function getCourses(): Collection
    {
        return $this->courses;
    }

    public function addCourse(Course $course): self
    {
        if (!$this->courses->contains($course)) {
            $this->courses->add($course);
        }

        return $this;
    }

    public function removeCourse(Course $course): self
    {
        $this->courses->removeElement($course);

        return $this;
    }

    public function getProgram(): ?Program
    {
        return $this->program;
    }

    public function setProgram(?Program $program): self
    {
        $this->program = $program;

        return $this;
    }

    /**
     * @return Collection<int, self>
     */
    public function getModules(): Collection
    {
        return $this->modules;
    }

    public function addModule(self $module): static
    {
        if (!$this->modules->contains($module)) {
            $this->modules->add($module);
        }

        return $this;
    }

    public function removeModule(self $module): static
    {
        $this->modules->removeElement($module);

        return $this;
    }
}
