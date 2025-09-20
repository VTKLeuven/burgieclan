<?php

namespace App\Entity;

use DateTime;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity]
#[ORM\Table(name: 'announcement')]
class Announcement extends Node
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\Column(type: Types::BOOLEAN)]
    private ?bool $priority = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $title_nl = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $title_en = null;

    #[ORM\Column(type: Types::TEXT)]
    private ?string $content_nl = null;

    #[ORM\Column(type: Types::TEXT)]
    private ?string $content_en = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    #[Assert\GreaterThanOrEqual('now Europe/Brussels')]
    private DateTime $startTime;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    #[Assert\GreaterThan(propertyPath: 'startTime')]
    private DateTime $endTime;

    public static array $AVAILABLE_LANGUAGES = [
        'nl' => 'Dutch',
        'en' => 'English',
    ];

    public static string $DEFAULT_LANGUAGE = 'nl';

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getStartTime(): DateTime
    {
        return $this->startTime;
    }

    public function setStartTime(DateTime $startTime): void
    {
        $this->startTime = $startTime;
    }

    public function getEndTime(): DateTime
    {
        return $this->endTime;
    }

    public function setEndTime(DateTime $endTime): void
    {
        $this->endTime = $endTime;
    }

    public function getTitleNl(): ?string
    {
        return $this->title_nl;
    }

    public function setTitleNl(?string $title): static
    {
        $this->title_nl = $title;

        return $this;
    }

    public function getTitleEn(): ?string
    {
        return $this->title_en;
    }

    public function setTitleEn(?string $title): static
    {
        $this->title_en = $title;

        return $this;
    }

    public function getContentEn(): ?string
    {
        return $this->content_en;
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

    public function setContentEn(string $content): static
    {
        $this->content_en = $content;

        return $this;
    }

    public function isPriority(): bool
    {
        return $this->priority;
    }

    public function setPriority(bool $priority): static
    {
        $this->priority = $priority;

        return $this;
    }

    public function getTitle(string $lang): ?string
    {
        $title = $this->{'title_' . $lang};
        return (!empty($title)) ? $title : $this->{'title_' . self::$DEFAULT_LANGUAGE};
    }

    public function getContent(string $lang): ?string
    {
        $content = $this->{'content_' . $lang};
        return (!empty($content)) ? $content : $this->{'content_' . self::$DEFAULT_LANGUAGE};
    }
}
