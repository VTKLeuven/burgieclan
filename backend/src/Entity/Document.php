<?php

namespace App\Entity;

use App\Repository\DocumentRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\HttpFoundation\File\File;
use Vich\UploaderBundle\Mapping\Annotation as Vich;

#[Vich\Uploadable]
#[ORM\Entity(repositoryClass: DocumentRepository::class)]
class Document extends Node
{
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

    /**
     * @var Collection
     */
    #[ORM\OneToMany(mappedBy: 'document', targetEntity: DocumentVote::class, cascade: ['remove'], orphanRemoval: true)]
    private Collection $votes;

    public function __construct(User $creator)
    {
        parent::__construct($creator);
        $this->votes = new ArrayCollection();
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

    public function getVotes(): Collection
    {
        return $this->votes;
    }

    public function addVote(DocumentVote $vote): self
    {
        if (!$this->votes->contains($vote)) {
            $this->votes->add($vote);
        }

        return $this;
    }

    public function removeVote(DocumentVote $vote): self
    {
        if ($this->votes->removeElement($vote)) {
            $vote->setDocument(null);
        }
        return $this;
    }
}
