<?php

namespace App\Entity;

use App\Repository\CourseRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * Defines the properties of the Course entity to represent the application courses.
 * See https://burgieclan.atlassian.net/wiki/spaces/Burgieclan/pages/8192123/Vakkenbeheer
 *
 * @author Pedro Devogelaere <pedro.devogelaere@vtk.be>
 */
#[ORM\Entity(repositoryClass: CourseRepository::class)]
#[ORM\Table(name: 'course')]
class Course
{
    final public const SEMESTERS = [
        'Semester 1' => 'Semester 1',
        'Semester 2' => 'Semester 2',
    ];

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(type: Types::STRING, length: 255)]
    #[Assert\NotBlank]
    private string $name;

    #[ORM\Column(type: Types::STRING, length: 255, unique: true)]
    #[Assert\NotBlank]
    #[Assert\Length(6)]
    private string $code;

    #[ORM\Column(type: Types::JSON, nullable: true)]
    private array $professors = [];

    #[ORM\Column(type: Types::JSON, nullable: true)]
    private array $semesters = [];

    #[ORM\Column(type: Types::STRING, length: 7)]
    #[Assert\NotBlank]
    #[Assert\Choice(choices: ['nl', 'en'], message: 'Choose a valid language.')]
    private string $language;

    #[ORM\Column(nullable: true)]
    #[Assert\Positive]
    private ?int $credits = null;

    /**
     * @var Collection<int, self>
     */
    #[ORM\ManyToMany(targetEntity: self::class, inversedBy: 'newCourses')]
    private Collection $oldCourses;

    /**
     * @var Collection<int, self>
     */
    #[ORM\ManyToMany(targetEntity: self::class, mappedBy: 'oldCourses')]
    private Collection $newCourses;

    /**
     * @var Collection<int, Module>
     */
    #[ORM\ManyToMany(targetEntity: Module::class, mappedBy: 'courses')]
    private Collection $modules;

    /**
     * @var Collection<int, CourseComment>
     */
    #[ORM\OneToMany(mappedBy: 'course', targetEntity: CourseComment::class, orphanRemoval: true)]
    private Collection $courseComments;

    /**
     * @var Collection<int, self>
     */
    #[ORM\ManyToMany(targetEntity: self::class, inversedBy: "identicalCourses")]
    #[ORM\JoinTable(name: "course_identical_courses")]
    private Collection $identicalCourses;

    public function __construct()
    {
        $this->oldCourses = new ArrayCollection();
        $this->newCourses = new ArrayCollection();
        $this->courseComments = new ArrayCollection();
        $this->modules = new ArrayCollection();
        $this->identicalCourses = new ArrayCollection();
    }

    public function __toString(): string
    {
        return sprintf('%s (%s)', $this->getName(), $this->getCode());
    }

    public function getId(): ?int
    {
        return $this->id;
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

    public function getModules(): Collection
    {
        return $this->modules;
    }

    public function setModules(?Collection $modules): self
    {
        $this->modules = $modules;

        return $this;
    }

    public function getProfessors(): array
    {
        return $this->professors;
    }

    public function setProfessors(?array $professors): self
    {
        $this->professors = $professors;

        return $this;
    }

    public function getSemesters(): array
    {
        return $this->semesters;
    }

    public function setSemesters(?array $semesters): self
    {
        $this->semesters = $semesters;

        return $this;
    }

    public function getLanguage(): string
    {
        return $this->language;
    }

    public function setLanguage(string $language): self
    {
        $this->language = $language;

        return $this;
    }

    public function getCode(): string
    {
        return $this->code;
    }

    public function setCode(string $code): self
    {
        $this->code = $code;

        return $this;
    }

    /**
     * @return Collection<int, self>
     */
    public function getOldCourses(): Collection
    {
        return $this->oldCourses;
    }

    public function addOldCourse(self $oldCourse): self
    {
        if (!$this->oldCourses->contains($oldCourse)) {
            $this->oldCourses->add($oldCourse);
            $oldCourse->addNewCourse($this);
        }

        return $this;
    }

    public function removeOldCourse(self $oldCourse): self
    {
        if ($this->oldCourses->removeElement($oldCourse)) {
            $this->oldCourses->removeElement($oldCourse);
            $oldCourse->removeNewCourse($this);
        }
        return $this;
    }

    /**
     * @return Collection<int, self>
     */
    public function getNewCourses(): Collection
    {
        return $this->newCourses;
    }

    public function addNewCourse(self $newCourse): self
    {
        if (!$this->newCourses->contains($newCourse)) {
            $this->newCourses->add($newCourse);
            $newCourse->addOldCourse($this);
        }

        return $this;
    }

    public function removeNewCourse(self $newCourse): self
    {
        if ($this->newCourses->removeElement($newCourse)) {
            $this->newCourses->removeElement($newCourse);
            $newCourse->removeOldCourse($this);
        }

        return $this;
    }

    public function getCredits(): ?int
    {
        return $this->credits;
    }

    public function setCredits(?int $credits): self
    {
        $this->credits = $credits;

        return $this;
    }

    /**
     * @return Collection<int, CourseComment>
     */
    public function getCourseComments(): Collection
    {
        return $this->courseComments;
    }

    public function addCourseComment(CourseComment $courseComment): self
    {
        if (!$this->courseComments->contains($courseComment)) {
            $this->courseComments->add($courseComment);
            $courseComment->setCourse($this);
        }

        return $this;
    }

    public function addModule(Module $module): self
    {
        if (!$this->modules->contains($module)) {
            $this->modules->add($module);
            $module->addCourse($this);
        }

        return $this;
    }

    public function removeCourseComment(CourseComment $courseComment): self
    {
        $this->courseComments->removeElement($courseComment);

        return $this;
    }

    public function removeModule(Module $module): self
    {
        if ($this->modules->removeElement($module)) {
            $module->removeCourse($this);
        }

        return $this;
    }

    /**
     * @return Collection<int, self>
     */
    public function getIdenticalCourses(): Collection
    {
        return $this->identicalCourses;
    }

    public function addIdenticalCourse(self $course): self
    {
        if (!$this->identicalCourses->contains($course)) {
            $this->identicalCourses[] = $course;
            $course->addIdenticalCourse($this); // Maintain bidirectional relationship
        }

        return $this;
    }

    public function removeIdenticalCourse(self $course): self
    {
        if ($this->identicalCourses->removeElement($course)) {
            $course->removeIdenticalCourse($this);
        }

        return $this;
    }
}
