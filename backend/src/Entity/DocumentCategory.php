<?php

namespace App\Entity;

use App\Repository\DocumentCategoryRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: DocumentCategoryRepository::class)]
class DocumentCategory
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    public static array $AVAILABLE_LANGUAGES = [
        'nl' => 'Dutch',
        'en' => 'English',
    ];

    public static string $DEFAULT_LANGUAGE = 'nl';

    #[ORM\Column(length: 255)]
    private ?string $name_nl = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $name_en = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function __toString(): string
    {
        return $this->getNameNl();
    }

    public function getName(string $lang): ?string
    {
        return $this->{'name_' . $lang} ?? $this->{'name_' . self::$DEFAULT_LANGUAGE};
    }

    public function getNameNl(): ?string
    {
        return $this->name_nl;
    }

    public function setNameNl(string $name): static
    {
        $this->name_nl = $name;

        return $this;
    }

    public function getNameEn(): ?string
    {
        return $this->name_en;
    }

    public function setNameEn(?string $name): static
    {
        $this->name_en = $name;

        return $this;
    }
}
