<?php

namespace App\Entity;

use App\Repository\PageRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: PageRepository::class)]
class Page
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private string $name;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $content = null;

    #[ORM\Column(length: 255, unique: true)]
    private string $urlKey;

    #[ORM\Column]
    /*
     * If unauthorized users can view the page
     */
    private bool $publicAvailable = false;

    /**
     * @param string $name
     * @param string|null $urlKey
     */
    public function __construct(string $name, ?string $urlKey = null)
    {
        $this->name = $name;
        $this->urlKey = is_null($urlKey) ? self::createUrlKey($name): self::createUrlKey($urlKey);
    }


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

    public function getContent(): ?string
    {
        return $this->content;
    }

    public function setContent(?string $content): static
    {
        $this->content = $content;

        return $this;
    }

    public function getUrlKey(): ?string
    {
        return $this->urlKey;
    }

    public function setUrlKey(string $urlKey): static
    {
        $this->urlKey = self::createUrlKey($urlKey);

        return $this;
    }

    public function isPublicAvailable(): ?bool
    {
        return $this->publicAvailable;
    }

    public function setPublicAvailable(bool $publicAvailable): static
    {
        $this->publicAvailable = $publicAvailable;

        return $this;
    }

    /**
     * Creates a clean URL key from the given string.
     *
     * @static
     * @param string $string    The string that will be cleaned
     * @param string $delimiter The delimiter used to replace spaces
     * @return string
     */
    public static function createUrlKey(string $string, string $delimiter = '-'): string
    {
        $clean = iconv('UTF-8', 'ASCII//TRANSLIT', $string);
        $clean = preg_replace('/[^a-zA-Z0-9\/_|+ -]/', '', $clean);
        $clean = strtolower(trim($clean, '-'));
        $clean = preg_replace('/[\/_|+ -]+/', $delimiter, $clean);

        return $clean;
    }
}
