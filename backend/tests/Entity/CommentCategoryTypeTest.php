<?php

namespace App\Tests\Entity;

use App\Entity\CommentCategory;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\Component\Validator\Validator\ValidatorInterface;

/**
 * A comment section is either an ordinary discussion or one that also carries a 1-5 axis.
 * Which of the two is a per-category setting an admin controls, so nothing here decides
 * which sections get stars - only that both shapes behave.
 */
class CommentCategoryTypeTest extends KernelTestCase
{
    private function validator(): ValidatorInterface
    {
        self::bootKernel();

        return static::getContainer()->get(ValidatorInterface::class);
    }

    private function category(string $name = 'Studiebelasting'): CommentCategory
    {
        // nameEn carries Assert\NotBlank even though its column is nullable, so a category
        // without one never validates. Unrelated to types; set so these tests see only the
        // violations they are about.
        return (new CommentCategory())->setNameNl($name)->setNameEn('Study load');
    }

    public function testASectionIsAnOrdinaryDiscussionUntilSomeoneChangesIt(): void
    {
        $category = $this->category();

        self::assertSame(CommentCategory::TYPE_DISCUSSION, $category->getType());
        self::assertFalse($category->isRated());
    }

    public function testARatedSectionMustLabelBothEndsOfItsScale(): void
    {
        // Without labels a score is unreadable: "Studiebelasting 5/5" means both "very heavy"
        // and "very well balanced", and students would answer in both directions at once.
        $category = $this->category()->setType(CommentCategory::TYPE_RATED);

        $violations = $this->validator()->validate($category);

        $paths = array_map(
            static fn($violation) => $violation->getPropertyPath(),
            iterator_to_array($violations)
        );
        self::assertContains('rating_low_label_nl', $paths);
        self::assertContains('rating_high_label_nl', $paths);
    }

    public function testALabelledRatedSectionIsValid(): void
    {
        $category = $this->category()
            ->setType(CommentCategory::TYPE_RATED)
            ->setRatingLowLabelNl('licht')
            ->setRatingHighLabelNl('zwaar');

        self::assertCount(0, $this->validator()->validate($category));
    }

    public function testADiscussionSectionNeedsNoLabels(): void
    {
        self::assertCount(0, $this->validator()->validate($this->category()));
    }

    public function testAnUnknownTypeIsRejected(): void
    {
        $category = $this->category()->setType('collaborative');

        self::assertGreaterThan(
            0,
            count($this->validator()->validate($category)),
            'RECORD and COLLABORATIVE are not built yet; the enum must not silently accept them.'
        );
    }

    public function testEnglishLabelsFallBackToDutch(): void
    {
        $category = $this->category()
            ->setType(CommentCategory::TYPE_RATED)
            ->setRatingLowLabelNl('licht')
            ->setRatingHighLabelNl('zwaar');

        // Same fallback the name and description already use, so a half-translated category
        // shows a Dutch label rather than an empty end of the scale.
        self::assertSame('licht', $category->getRatingLowLabel('en'));
        self::assertSame('zwaar', $category->getRatingHighLabel('en'));

        $category->setRatingLowLabelEn('light');
        self::assertSame('light', $category->getRatingLowLabel('en'));
        self::assertSame('licht', $category->getRatingLowLabel('nl'));
    }
}
