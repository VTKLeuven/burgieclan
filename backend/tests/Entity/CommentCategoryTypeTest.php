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
        return (new CommentCategory())->setNameNl($name)->setNameEn('Study load');
    }

    public function testASectionIsAnOrdinaryDiscussionUntilSomeoneChangesIt(): void
    {
        $category = $this->category();

        self::assertSame(CommentCategory::TYPE_DISCUSSION, $category->getType());
        self::assertFalse($category->isRated());
    }

    public function testARatedSectionDoesNotHaveToLabelItsScale(): void
    {
        // Most axes read fine unlabelled - five stars on "Kwaliteit van de cursus" is
        // obviously good - and the category description is already shown above the comments
        // for the awkward ones like Studiebelasting. Left to the admin's judgement.
        $category = $this->category()->setType(CommentCategory::TYPE_RATED);

        self::assertCount(0, $this->validator()->validate($category));
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
