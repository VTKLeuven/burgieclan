<?php

namespace App\Entity;

use App\Repository\FaqQuestionRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * A question asked from the public FAQ page, waiting to be handled in the admin.
 *
 * Distinct from FaqItem: this is the inbox, FaqItem is the published answer. A question is
 * "promoted" into a FaqItem once it turns out to be worth answering publicly.
 */
#[ORM\Entity(repositoryClass: FaqQuestionRepository::class)]
#[ORM\Table(name: 'faq_question')]
// The admin menu badge counts new questions on every admin page load.
#[ORM\Index(name: 'idx_faq_question_status', columns: ['status'])]
#[ORM\Index(name: 'idx_faq_question_author', columns: ['author_id'])]
class FaqQuestion extends BaseEntity
{
    public const STATUS_NEW = 'new';
    public const STATUS_HANDLED = 'handled';
    public const STATUS_ARCHIVED = 'archived';

    public const TYPE_GENERAL = 'general_faq';
    public const TYPE_COURSE_ISSUE = 'course_issue';
    public const TYPE_EXAM = 'exam_feedback';
    public const TYPE_OTHER = 'other';

    /**
     * Mirrors FaqItem::$DEFAULT_LANGUAGE, which is a static property and so cannot be used in the
     * constant expressions this default is needed in (property defaults, attribute arguments).
     */
    public const DEFAULT_LOCALE = 'nl';

    public static array $STATUSES = [
        'New' => self::STATUS_NEW,
        'Handled' => self::STATUS_HANDLED,
        'Archived' => self::STATUS_ARCHIVED,
    ];

    public static array $TYPES = [
        'General FAQ' => self::TYPE_GENERAL,
        'Course / Exercise Session Issue' => self::TYPE_COURSE_ISSUE,
        'Exam Feedback' => self::TYPE_EXAM,
        'Other' => self::TYPE_OTHER,
    ];

    #[ORM\Column(type: Types::TEXT)]
    private string $question;

    /**
     * Language the question was asked in, so promoting it prefills the matching FaqItem field.
     */
    #[ORM\Column(length: 2)]
    private string $locale = self::DEFAULT_LOCALE;

    /**
     * The asker. Nullable so deleting a user does not take their questions down with them —
     * the question text stays useful to the FAQ even once nobody can be replied to.
     */
    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?User $author = null;

    #[ORM\Column(length: 20)]
    private string $status = self::STATUS_NEW;

    #[ORM\Column(length: 30)]
    private string $type = self::TYPE_GENERAL;

    /**
     * @return string[]
     */
    public static function getAvailableTypes(): array
    {
        return array_values(self::$TYPES);
    }

    /**
     * The locales a question may be asked in — the same set FaqItem publishes answers in.
     *
     * @return string[]
     */
    public static function getAvailableLocales(): array
    {
        return array_keys(FaqItem::$AVAILABLE_LANGUAGES);
    }

    public function getQuestion(): string
    {
        return $this->question;
    }

    public function setQuestion(string $question): static
    {
        $this->question = $question;

        return $this;
    }

    public function getLocale(): string
    {
        return $this->locale;
    }

    public function setLocale(string $locale): static
    {
        $this->locale = $locale;

        return $this;
    }

    public function getAuthor(): ?User
    {
        return $this->author;
    }

    public function setAuthor(?User $author): static
    {
        $this->author = $author;

        return $this;
    }

    public function getStatus(): string
    {
        return $this->status;
    }

    public function setStatus(string $status): static
    {
        $this->status = $status;

        return $this;
    }

    public function getType(): string
    {
        return $this->type;
    }

    public function setType(string $type): static
    {
        $this->type = $type;

        return $this;
    }

    public function isNew(): bool
    {
        return $this->status === self::STATUS_NEW;
    }

    public function __toString(): string
    {
        return sprintf('%s (ID: %s)', $this->question ?? 'FAQ Question', $this->id);
    }
}
