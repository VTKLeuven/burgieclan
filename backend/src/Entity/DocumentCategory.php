<?php

namespace App\Entity;

use App\Repository\DocumentCategoryRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: DocumentCategoryRepository::class)]
class DocumentCategory
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private ?string $name = null;

    #[ORM\ManyToOne(targetEntity: self::class, inversedBy: 'subcategories')]
    #[ORM\JoinColumn(nullable: true)]
    private ?self $parent = null;

    #[ORM\OneToMany(mappedBy: 'parent', targetEntity: self::class)]
    private Collection $subcategories;

    #[ORM\OneToMany(targetEntity: Document::class, mappedBy: 'category')]
    private Collection $documents;

    public function __construct()
    {
        $this->subcategories = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getName(): ?string
    {
        return $this->name;
    }

    public function getDocuments(): Collection
    {
        return $this->documents;
    }

    public function addDocument(Document $document): self
    {
        if (!$this->documents->contains($document)) {
            $this->documents[] = $document;
            $document->setCategory($this);
        }

        return $this;
    }

    public function removeDocument(Document $document): self
    {
        if ($this->documents->removeElement($document)) {
            if ($document->getCategory() === $this) {
                $document->setCategory(null);
            }
        }

        return $this;
    }


    public function __toString(): string
    {
        return $this->getName();
    }

    public function setName(string $name): self
    {
        $this->name = $name;

        return $this;
    }

    public function getParent(): ?self
    {
        return $this->parent;
    }

    public function setParent(?self $parent): self
    {
        $this->parent = $parent;

        return $this;
    }

    public function getSubcategories(): Collection
    {
        return $this->subcategories;
    }

    public function addSubcategory(self $subcategory): self
    {
        if (!$this->subcategories->contains($subcategory) && !$this->isAncestorOf($subcategory)) {
            $this->subcategories->add($subcategory);
            $subcategory->setParent($this);
        }

        return $this;
    }

    public function removeSubcategory(self $subcategory): self
    {
        if ($this->subcategories->removeElement($subcategory)) {
            if ($subcategory->getParent() === $this) {
                $subcategory->setParent(null);
            }
        }

        return $this;
    }

    public function isAncestorOf(self $category): bool
    {
        $parent = $category->getParent();
        while ($parent !== null) {
            if ($parent === $this) {
                return true;
            }
            $parent = $parent->getParent();
        }
        return false;
    }
}
