<?php

namespace App\Entity;

use App\Repository\PageRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;
use App\Validator as CustomAssert;

#[ORM\Entity(repositoryClass: PageRepository::class)]
class Page
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255, unique: true)]
    private string $urlKey;

    #[ORM\Column]
    /*
     * If unauthorized users can view the page
     */
    private bool $publicAvailable = false;

    public static array $AVAILABLE_LANGUAGES = [
        'nl' => 'Dutch',
        'en' => 'English',
    ];

    public static string $DEFAULT_LANGUAGE = 'nl';

    #[ORM\Column(length: 255)]
    private ?string $name_nl = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $content_nl = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $name_en = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $content_en = null;

    /**
     * @param string $name
     * @param string|null $urlKey
     */
    public function __construct(string $name, ?string $urlKey = null)
    {
        $this->urlKey = is_null($urlKey) ? self::createUrlKey($name): self::createUrlKey($urlKey);
    }

    public function getId(): ?int
    {
        return $this->id;
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

    public function getName(string $lang): ?string
    {
        return $this->{'name_'.$lang} ?? $this->{'name_'.self::$DEFAULT_LANGUAGE};
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

    public function getContent(string $lang): ?string
    {
        return $this->{'content_'.$lang} ?? $this->{'content_'.self::$DEFAULT_LANGUAGE};
    }

    public function getContentNl(): ?string
    {
        return $this->content_nl;
    }

    public function setContentNl(string $content): static
    {
        $this->content_nl = $content;

        return $this;
    }

    public function getNameEn(): ?string
    {
        return $this->name_en;
    }

    public function setNameEn(string $name): static
    {
        $this->name_en = $name;

        return $this;
    }

    public function getContentEn(): ?string
    {
        return $this->content_en;
    }

    public function setContentEn(string $content): static
    {
        $this->content_en = $content;

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
