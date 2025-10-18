<?php

namespace App\Entity;

use App\Repository\CommentCategoryRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: CommentCategoryRepository::class)]
class CommentCategory
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
    #[Assert\NotBlank]
    private string $name_nl;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $description_nl = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Assert\NotBlank]
    private ?string $name_en = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $description_en = null;

    public function __toString(): string
    {
        return sprintf('%s (%s)', $this->getNameNl(), $this->getNameEn());
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getName(string $lang): ?string
    {
        return $this->{'name_' . $lang} ?? $this->{'name_' . self::$DEFAULT_LANGUAGE};
    }

    public function getNameNl(): string
    {
        return $this->name_nl;
    }

    public function setNameNl(string $name): static
    {
        $this->name_nl = $name;

        return $this;
    }

    public function getDescription(string $lang): ?string
    {
        return $this->{'description_' . $lang} ?? $this->{'description_' . self::$DEFAULT_LANGUAGE};
    }

    public function getDescriptionNl(): ?string
    {
        return $this->description_nl;
    }

    public function setDescriptionNl(?string $description): static
    {
        $this->description_nl = $description;

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

    public function getDescriptionEn(): ?string
    {
        return $this->description_en;
    }

    public function setDescriptionEn(?string $description): static
    {
        $this->description_en = $description;

        return $this;
    }
}
