<?php

namespace App\Entity;

use App\Repository\CommentCategoryRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: CommentCategoryRepository::class)]
class CommentCategory extends BaseEntity
{
    public static array $AVAILABLE_LANGUAGES = [
        'nl' => 'Dutch',
        'en' => 'English',
    ];

    public static string $DEFAULT_LANGUAGE = 'nl';

    /** An ordinary thread of comments. What every category was before ratings existed. */
    public const TYPE_DISCUSSION = 'discussion';

    /** A thread of comments that also carries a 1-5 axis students can rate. */
    public const TYPE_RATED = 'rated';

    /** @var array<string, string> label => stored value, for the admin dropdown */
    public const TYPES = [
        'Discussion only' => self::TYPE_DISCUSSION,
        'Discussion + star rating' => self::TYPE_RATED,
    ];

    /**
     * How this section behaves. Data, not code: switching a section to rated is an admin
     * decision, so which categories carry stars is never hardcoded anywhere.
     */
    #[ORM\Column(length: 16, options: ['default' => self::TYPE_DISCUSSION])]
    #[Assert\Choice(choices: [self::TYPE_DISCUSSION, self::TYPE_RATED])]
    private string $type = self::TYPE_DISCUSSION;

    /**
     * Optional: what the ends of the scale mean, e.g. "licht" and "zwaar" for Studiebelasting.
     *
     * Most axes read fine without them - five stars on "Kwaliteit van de cursus" is obviously
     * good. Studiebelasting is the awkward one, where 5/5 reads as both "very heavy" and "very
     * well balanced". Left to the admin's judgement rather than required, since the category
     * description is already shown above the comments and can carry the explanation instead.
     */
    #[ORM\Column(length: 40, nullable: true)]
    private ?string $rating_low_label_nl = null;

    #[ORM\Column(length: 40, nullable: true)]
    private ?string $rating_low_label_en = null;

    #[ORM\Column(length: 40, nullable: true)]
    private ?string $rating_high_label_nl = null;

    #[ORM\Column(length: 40, nullable: true)]
    private ?string $rating_high_label_en = null;

    #[ORM\Column(length: 255)]
    #[Assert\NotBlank]
    private string $name_nl;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $description_nl = null;

    #[ORM\Column(length: 255)]
    #[Assert\NotBlank]
    private string $name_en = '';

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $description_en = null;

    public function __toString(): string
    {
        return sprintf('%s (%s)', $this->getNameNl(), $this->getNameEn());
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

    public function isRated(): bool
    {
        return self::TYPE_RATED === $this->type;
    }

    public function getRatingLowLabel(string $lang): ?string
    {
        return $this->{'rating_low_label_' . $lang} ?? $this->{'rating_low_label_' . self::$DEFAULT_LANGUAGE};
    }

    public function getRatingHighLabel(string $lang): ?string
    {
        return $this->{'rating_high_label_' . $lang} ?? $this->{'rating_high_label_' . self::$DEFAULT_LANGUAGE};
    }

    public function getRatingLowLabelNl(): ?string
    {
        return $this->rating_low_label_nl;
    }

    public function setRatingLowLabelNl(?string $label): static
    {
        $this->rating_low_label_nl = $label;

        return $this;
    }

    public function getRatingLowLabelEn(): ?string
    {
        return $this->rating_low_label_en;
    }

    public function setRatingLowLabelEn(?string $label): static
    {
        $this->rating_low_label_en = $label;

        return $this;
    }

    public function getRatingHighLabelNl(): ?string
    {
        return $this->rating_high_label_nl;
    }

    public function setRatingHighLabelNl(?string $label): static
    {
        $this->rating_high_label_nl = $label;

        return $this;
    }

    public function getRatingHighLabelEn(): ?string
    {
        return $this->rating_high_label_en;
    }

    public function setRatingHighLabelEn(?string $label): static
    {
        $this->rating_high_label_en = $label;

        return $this;
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

    public function getNameEn(): string
    {
        return $this->name_en;
    }

    public function setNameEn(string $name): static
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
