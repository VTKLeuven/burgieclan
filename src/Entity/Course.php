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
#[ORM\Table(name: 'burgieclan_course')]
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
    private ?string $name = null;

    #[ORM\Column(type: Types::STRING, length: 255, unique: true)]
    #[Assert\NotBlank]
    #[Assert\Length(6)]
    private ?string $code = null;

    #[ORM\Column(type: Types::JSON, nullable: true)]
    private array $modules = [];

    #[ORM\Column(type: Types::JSON, nullable: true)]
    private array $professors = [];

    #[ORM\Column(type: Types::JSON, nullable: true)]
    private array $semesters = [];

    #[ORM\Column(nullable: true)]
    #[Assert\Positive]
    private ?int $credits = null;

    #[ORM\ManyToMany(targetEntity: self::class, inversedBy: 'new_courses')]
    private Collection $old_courses;

    #[ORM\ManyToMany(targetEntity: self::class, mappedBy: 'old_courses')]
    private Collection $new_courses;

    #[ORM\OneToMany(mappedBy: 'course', targetEntity: CourseComment::class, orphanRemoval: true)]
    private Collection $courseComments;

    public function __construct()
    {
        $this->old_courses = new ArrayCollection();
        $this->new_courses = new ArrayCollection();
        $this->courseComments = new ArrayCollection();
    }

    public function __toString(): string
    {
        return $this->getName();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getName(): ?string
    {
        return $this->name;
    }

    public function setName(string $name): self
    {
        $this->name = $name;

        return $this;
    }

    public function getModules(): array
    {
        return $this->modules;
    }

    public function setModules(?array $modules): self
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

    public function getCode(): ?string
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
        return $this->old_courses;
    }

    public function addOldCourse(self $oldCourse): self
    {
        if (!$this->old_courses->contains($oldCourse)) {
            $this->old_courses->add($oldCourse);
            $oldCourse->addNewCourse($this);
        }

        return $this;
    }

    public function removeOldCourse(self $oldCourse): self
    {
        if ($this->old_courses->removeElement($oldCourse)) {
            $this->old_courses->removeElement($oldCourse);
            $oldCourse->removeNewCourse($this);
        }
        return $this;
    }

    /**
     * @return Collection<int, self>
     */
    public function getNewCourses(): Collection
    {
        return $this->new_courses;
    }

    public function addNewCourse(self $newCourse): self
    {
        if (!$this->new_courses->contains($newCourse)) {
            $this->new_courses->add($newCourse);
            $newCourse->addOldCourse($this);
        }

        return $this;
    }

    public function removeNewCourse(self $newCourse): self
    {
        if ($this->new_courses->removeElement($newCourse)) {
            $this->new_courses->removeElement($newCourse);
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

    public function removeCourseComment(CourseComment $courseComment): self
    {
        if ($this->courseComments->removeElement($courseComment)) {
            // set the owning side to null (unless already changed)
            if ($courseComment->getCourse() === $this) {
                $courseComment->setCourse(null);
            }
        }

        return $this;
    }
}