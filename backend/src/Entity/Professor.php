<?php

namespace App\Entity;

use App\Repository\ProfessorRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * Defines the properties of the Professor entity to represent university professors.
 * Information is retrieved from KUL site based on u-number.
 */
#[ORM\Entity(repositoryClass: ProfessorRepository::class)]
#[ORM\Table(name: 'professor')]
class Professor
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(type: Types::STRING, length: 10, unique: true)]
    #[Assert\NotBlank]
    #[Assert\Regex(pattern: '/^u\d{7}$/', message: 'U-number must be in format u1234567')]
    private ?string $uNumber = null;

    #[ORM\Column(type: Types::STRING, length: 255)]
    #[Assert\NotBlank]
    private ?string $name = null;

    #[ORM\Column(type: Types::STRING, length: 255, nullable: true)]
    #[Assert\Email]
    private ?string $email = null;

    #[ORM\Column(type: Types::STRING, length: 500, nullable: true)]
    private ?string $pictureUrl = null;

    #[ORM\Column(type: Types::STRING, length: 255, nullable: true)]
    private ?string $department = null;

    #[ORM\Column(type: Types::STRING, length: 255, nullable: true)]
    private ?string $title = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE, nullable: true)]
    private ?\DateTimeInterface $lastUpdated = null;

    #[ORM\ManyToMany(targetEntity: Course::class, mappedBy: 'professors')]
    private Collection $courses;

    public function __construct()
    {
        $this->courses = new ArrayCollection();
    }

    public function __toString(): string
    {
        return $this->getName() ?? $this->getUNumber() ?? '';
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getUNumber(): ?string
    {
        return $this->uNumber;
    }

    public function setUNumber(string $uNumber): self
    {
        $this->uNumber = $uNumber;
        return $this;
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

    public function getEmail(): ?string
    {
        return $this->email;
    }

    public function setEmail(?string $email): self
    {
        $this->email = $email;
        return $this;
    }

    public function getPictureUrl(): ?string
    {
        return $this->pictureUrl;
    }

    public function setPictureUrl(?string $pictureUrl): self
    {
        $this->pictureUrl = $pictureUrl;
        return $this;
    }

    public function getDepartment(): ?string
    {
        return $this->department;
    }

    public function setDepartment(?string $department): self
    {
        $this->department = $department;
        return $this;
    }

    public function getTitle(): ?string
    {
        return $this->title;
    }

    public function setTitle(?string $title): self
    {
        $this->title = $title;
        return $this;
    }

    public function getLastUpdated(): ?\DateTimeInterface
    {
        return $this->lastUpdated;
    }

    public function setLastUpdated(?\DateTimeInterface $lastUpdated): self
    {
        $this->lastUpdated = $lastUpdated;
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
            $course->addProfessor($this);
        }

        return $this;
    }

    public function removeCourse(Course $course): self
    {
        if ($this->courses->removeElement($course)) {
            $course->removeProfessor($this);
        }

        return $this;
    }
}