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
     *
     * Normally the programme-scoped moduleGroupId ("<programId>:<moduleGroupId>"). Folders that the
     * structural transforms invent instead carry one of ProgramTreeMapper::SYNTHETIC_KULID_PREFIXES
     * ("sem:", "semflat:", "semopt:", "keuzepakketten:") — the importer uses that to tell an admin
     * whether a detached module vanished because KU Leuven dropped it or because an import option
     * changed.
     *
     * Null for manually created modules, which the importer never touches.
     */
    #[ORM\Column(length: 255, nullable: true)]
    private ?string $kulId = null;

    /**
     * Sort order of this module among its siblings (the children of one parent module, or the
     * top-level modules of a program). Lower comes first; ties break on name. Editable from the
     * program structure tree editor so admins can arrange modules in a meaningful order.
     *
     * One position per module, but $modules is a self-referencing ManyToMany, so a module that
     * hangs under two parents shares a single value: reordering it under one parent reorders it
     * under the other as well. That is accepted for now — modules are effectively a tree in
     * practice — and fixing it properly means moving the ordering onto the join table, which
     * needs an explicit association entity.
     */
    #[ORM\Column(type: Types::INTEGER, options: ['default' => 0])]
    private int $position = 0;

    /**
     * Whether this module is an elective option (KU Leuven moduleGroupType "01" / "Optie") rather
     * than a compulsory structural group ("02" / "Groep"). Set by the importer; false for manually
     * created modules.
     */
    #[ORM\Column(type: Types::BOOLEAN, options: ['default' => false])]
    private bool $isElective = false;

    /**
     * Whether the courses in this module are compulsory.
     *
     * KU Leuven puts a `mandatory` flag on each course entry, but it never varies inside a group:
     * across ten engineering programmes, 0 of 193 course-holding groups had mixed values. So it is
     * a property of the module, not of the course — and storing it on the shared Course row (as an
     * earlier attempt did) let whichever programme was imported last win, because a course can be
     * compulsory in one programme and elective in another (67 of 172 shared courses differ).
     *
     * Independent of $isElective: a type=01 "Optie" group can hold compulsory courses (45 groups)
     * and a type=02 "Groep" can hold non-compulsory ones (105 groups). Different questions —
     * "is this a choice you make" versus "must you pass these".
     */
    #[ORM\Column(type: Types::BOOLEAN, options: ['default' => true])]
    private bool $coursesMandatory = true;

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

    public function areCoursesMandatory(): bool
    {
        return $this->coursesMandatory;
    }

    public function setCoursesMandatory(bool $coursesMandatory): self
    {
        $this->coursesMandatory = $coursesMandatory;

        return $this;
    }

    public function isElective(): bool
    {
        return $this->isElective;
    }

    public function setIsElective(bool $isElective): self
    {
        $this->isElective = $isElective;

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
