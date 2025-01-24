<?php

namespace App\Entity;

use App\Repository\DocumentRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\HttpFoundation\File\File;
use Vich\UploaderBundle\Mapping\Annotation as Vich;

#[Vich\Uploadable]
#[ORM\Entity(repositoryClass: DocumentRepository::class)]
class Document extends Node
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private ?string $name = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    private ?Course $course = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    private ?DocumentCategory $category = null;

    #[ORM\Column]
    private ?bool $under_review = null;

    #[Vich\UploadableField(mapping: 'document_object', fileNameProperty: 'file_name')]
    private ?File $file = null;

    #[ORM\Column(nullable: true)]
    private ?string $file_name = null;

    #[ORM\Column(length: 5, nullable: true)]
    private ?string $year = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getName(): ?string
    {
        return $this->name;
    }

    public function setName(string $name): static
    {
        $this->name = $name;
        return $this;
    }

    public function getCourse(): ?Course
    {
        return $this->course;
    }

    public function setCourse(?Course $course): static
    {
        $this->course = $course;

        return $this;
    }

    public function getCategory(): ?DocumentCategory
    {
        return $this->category;
    }

    public function setCategory(?DocumentCategory $category): static
    {
        $this->category = $category;

        return $this;
    }

    public function isUnderReview(): ?bool
    {
        return $this->under_review;
    }

    public function setUnderReview(bool $under_review): static
    {
        $this->under_review = $under_review;

        return $this;
    }

    public function getFileName(): ?string
    {
        return $this->file_name;
    }

    public function setFileName(?string $file_name): static
    {
        $this->file_name = $file_name;

        return $this;
    }

    public function getFile(): ?File
    {
        return $this->file;
    }

    public function setFile(?File $file = null): void
    {
        $this->file = $file;

        if (null !== $file) {
            // It is required that at least one field changes if you are using doctrine
            // otherwise the event listeners won't be called and the file is lost
            $this->setUpdateDate();
        }
    }

    public function __toString(): string
    {
        return $this->getName();
    }

    public function getYear(): ?string
    {
        return $this->year;
    }

    public function setYear(?string $year): static
    {
        $this->year = $year;

        return $this;
    }

    public static function getAcademicYearChoices(): array
    {
        $currentYear = (int)date('Y');
        $choices = [];
        for ($i = 0; $i < 10; $i++) {
            $startYear = $currentYear - $i;
            $endYear = $startYear + 1;
            $formattedYear = sprintf('%02d-%02d', $startYear % 100, $endYear % 100);
            $choices[$formattedYear] = $formattedYear;
        }
        return $choices;
    }
}
