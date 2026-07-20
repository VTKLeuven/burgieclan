<?php

namespace App\Entity;

use App\Repository\FaqItemRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: FaqItemRepository::class)]
#[ORM\Table(name: 'faq_item')]
class FaqItem extends BaseEntity
{
    public static array $AVAILABLE_LANGUAGES = [
        'nl' => 'Dutch',
        'en' => 'English',
    ];

    public static string $DEFAULT_LANGUAGE = 'nl';

    #[ORM\Column(length: 255)]
    private string $question_nl;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $question_en = null;

    #[ORM\Column(type: Types::TEXT)]
    private string $answer_nl;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $answer_en = null;

    #[ORM\Column(type: Types::INTEGER)]
    private int $position = 0;

    #[ORM\Column(type: Types::BOOLEAN)]
    private bool $published = true;

    public function getQuestionNl(): string
    {
        return $this->question_nl;
    }

    public function setQuestionNl(string $question): static
    {
        $this->question_nl = $question;

        return $this;
    }

    public function getQuestionEn(): ?string
    {
        return $this->question_en;
    }

    public function setQuestionEn(?string $question): static
    {
        $this->question_en = $question;

        return $this;
    }

    public function getAnswerNl(): string
    {
        return $this->answer_nl;
    }

    public function setAnswerNl(string $answer): static
    {
        $this->answer_nl = $answer;

        return $this;
    }

    public function getAnswerEn(): ?string
    {
        return $this->answer_en;
    }

    public function setAnswerEn(?string $answer): static
    {
        $this->answer_en = $answer;

        return $this;
    }

    public function getPosition(): int
    {
        return $this->position;
    }

    public function setPosition(int $position): static
    {
        $this->position = $position;

        return $this;
    }

    public function isPublished(): bool
    {
        return $this->published;
    }

    public function setPublished(bool $published): static
    {
        $this->published = $published;

        return $this;
    }

    public function getQuestion(string $lang): ?string
    {
        $question = $this->{'question_' . $lang};
        return (!empty($question)) ? $question : $this->{'question_' . self::$DEFAULT_LANGUAGE};
    }

    public function getAnswer(string $lang): ?string
    {
        $answer = $this->{'answer_' . $lang};
        return (!empty($answer)) ? $answer : $this->{'answer_' . self::$DEFAULT_LANGUAGE};
    }

    public function __toString(): string
    {
        return sprintf('%s (ID: %s)', $this->question_nl ?? 'FAQ Item', $this->id);
    }
}
