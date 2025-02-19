<?php

namespace App\Entity;

use App\Repository\DocumentRepository;
use DateTime;
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

    #[ORM\Column]
    private ?bool $anonymous = null;

    #[Vich\UploadableField(mapping: 'document_object', fileNameProperty: 'file_name')]
    private ?File $file = null;

    #[ORM\Column(nullable: true)]
    private ?string $file_name = null;

    #[ORM\Column(length: 11, nullable: true)]
    private ?string $year = null; // Ex. 2024 - 2025

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

    public function isAnonymous(): ?bool
    {
        return $this->anonymous;
    }

    public function setAnonymous(bool $anonymous): static
    {
        $this->anonymous = $anonymous;

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

    /**
     * Get the academic year choices based on the current year and the first year
     *
     * @param int $amountOfYears The number of years to generate choices for, default is 10
     * @param string|null $firstYear The first year to start generating choices from, default is null
     * @return array The array of academic year choices, formatted like '2024 - 2025' => '2024 - 2025'
     */
    public static function getAcademicYearChoices(int $amountOfYears = 10, string $firstYear = null): array
    {
        $currentYear = (int)date('Y');
        // Calculate the date of the last Monday of September
        $lastMondayOfSeptember = new DateTime('last monday of september ' . $currentYear);
        $today = new DateTime();

        if ($today <= $lastMondayOfSeptember) {
            // If today is before the last Monday of September, we are still in the previous academic year
            $currentYear--;
        }

        if (!is_null($firstYear)) {
            $firstYear = (int)substr($firstYear, 0, 4);
            $amountOfYears = max($amountOfYears, $currentYear - $firstYear + 1);
        }

        $choices = [];
        for ($i = 0; $i < $amountOfYears; $i++) {
            $startYear = $currentYear - $i;
            $endYear = $startYear + 1;
            $formattedYear = sprintf('%d - %d', $startYear, $endYear);
            $choices[$formattedYear] = $formattedYear;
        }
        return $choices;
    }
}
