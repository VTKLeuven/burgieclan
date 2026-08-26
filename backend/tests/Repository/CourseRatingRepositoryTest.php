<?php

namespace App\Tests\Repository;

use App\Constants\AcademicYear;
use App\Entity\CommentCategory;
use App\Entity\Course;
use App\Factory\CommentCategoryFactory;
use App\Factory\CourseFactory;
use App\Factory\CourseRatingFactory;
use App\Factory\UserFactory;
use App\Repository\CourseRatingRepository;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Zenstruck\Foundry\Test\Factories;
use Zenstruck\Foundry\Test\ResetDatabase;

class CourseRatingRepositoryTest extends KernelTestCase
{
    use Factories;
    use ResetDatabase;

    private function repository(): CourseRatingRepository
    {
        self::bootKernel();

        return static::getContainer()->get(CourseRatingRepository::class);
    }

    private function rate(Course $course, CommentCategory $category, int $value, string $year): void
    {
        CourseRatingFactory::createOne(
            [
            'course' => $course,
            'category' => $category,
            'value' => $value,
            'academicYear' => $year,
            // A fresh user each time: one person holds only one rating per axis.
            'creator' => UserFactory::createOne(),
            ]
        );
    }

    public function testAnAverageIsWithheldUntilEnoughPeopleHaveRated(): void
    {
        $repository = $this->repository();
        $course = CourseFactory::createOne();
        $category = CommentCategoryFactory::createOne(['type' => CommentCategory::TYPE_RATED]);
        $year = AcademicYear::current();

        $this->rate($course, $category, 5, $year);
        $this->rate($course, $category, 5, $year);

        $summary = $repository->summaryForCourse($course);
        self::assertSame(2, $summary[$category->getId()]['count']);
        self::assertNull(
            $summary[$category->getId()]['average'],
            'Two scores is noise, and on a small course it is also identifiable.'
        );

        $this->rate($course, $category, 2, $year);

        $summary = $repository->summaryForCourse($course);
        self::assertSame(3, $summary[$category->getId()]['count']);
        self::assertSame(4.0, $summary[$category->getId()]['average']);
    }

    /**
     * The recent window is the reason the year is stored at all: a course changes when the
     * professor does, and a lifetime average buries that.
     */
    public function testTheRecentWindowOnlyCountsTheYearsItAsksFor(): void
    {
        $repository = $this->repository();
        $course = CourseFactory::createOne();
        $category = CommentCategoryFactory::createOne(['type' => CommentCategory::TYPE_RATED]);

        foreach ([5, 5, 5] as $value) {
            $this->rate($course, $category, $value, '2025 - 2026');
        }
        foreach ([1, 1, 1] as $value) {
            $this->rate($course, $category, $value, '2014 - 2015');
        }

        $allTime = $repository->summaryForCourse($course);
        self::assertSame(6, $allTime[$category->getId()]['count']);
        self::assertSame(3.0, $allTime[$category->getId()]['average']);

        $recent = $repository->summaryForCourse($course, ['2025 - 2026']);
        self::assertSame(3, $recent[$category->getId()]['count']);
        self::assertSame(5.0, $recent[$category->getId()]['average']);
    }

    public function testAnEmptyYearWindowMatchesNothingRatherThanEverything(): void
    {
        $repository = $this->repository();
        $course = CourseFactory::createOne();
        $category = CommentCategoryFactory::createOne(['type' => CommentCategory::TYPE_RATED]);
        $this->rate($course, $category, 4, AcademicYear::current());

        // "No years" and "every year" are easy to conflate in a query builder, and getting it
        // wrong would silently turn the recent score into the all-time one.
        self::assertSame([], $repository->summaryForCourse($course, []));
        self::assertNotSame([], $repository->summaryForCourse($course, null));
    }

    public function testEveryRatedSectionComesBackFromOneQuery(): void
    {
        $repository = $this->repository();
        $course = CourseFactory::createOne();
        $workload = CommentCategoryFactory::createOne(['type' => CommentCategory::TYPE_RATED]);
        $teaching = CommentCategoryFactory::createOne(['type' => CommentCategory::TYPE_RATED]);
        $year = AcademicYear::current();

        $this->rate($course, $workload, 4, $year);
        $this->rate($course, $teaching, 2, $year);

        $summary = $repository->summaryForCourse($course);

        // The course page draws every axis at once; per-axis queries would be a round trip each.
        self::assertArrayHasKey($workload->getId(), $summary);
        self::assertArrayHasKey($teaching->getId(), $summary);
    }

    public function testTheYearBreakdownComesBackNewestFirstPerSection(): void
    {
        $repository = $this->repository();
        $course = CourseFactory::createOne();
        $category = CommentCategoryFactory::createOne(['type' => CommentCategory::TYPE_RATED]);
        $other = CommentCategoryFactory::createOne(['type' => CommentCategory::TYPE_RATED]);

        $this->rate($course, $category, 2, '2023 - 2024');
        $this->rate($course, $category, 4, '2025 - 2026');
        $this->rate($course, $category, 5, '2025 - 2026');
        $this->rate($course, $other, 1, '2025 - 2026');

        $byYear = $repository->summaryByYearForCourse($course);

        self::assertSame(['2025 - 2026', '2023 - 2024'], array_column($byYear[$category->getId()], 'year'));
        self::assertSame(4.5, $byYear[$category->getId()][0]['average']);
        self::assertSame(2, $byYear[$category->getId()][0]['count']);
        // Sections must not bleed into each other's breakdown.
        self::assertCount(1, $byYear[$other->getId()]);
    }

    public function testAUsersOwnScoresComeBackKeyedBySection(): void
    {
        $repository = $this->repository();
        $course = CourseFactory::createOne();
        $workload = CommentCategoryFactory::createOne(['type' => CommentCategory::TYPE_RATED]);
        $teaching = CommentCategoryFactory::createOne(['type' => CommentCategory::TYPE_RATED]);
        $student = UserFactory::createOne();
        $year = AcademicYear::current();

        CourseRatingFactory::createOne(
            [
            'course' => $course, 'category' => $workload, 'creator' => $student, 'value' => 4, 'academicYear' => $year,
            ]
        );
        // Somebody else's score on the same axis must not come back as this student's.
        $this->rate($course, $teaching, 1, $year);

        $own = $repository->findUserRatingsForCourse($course, $student);

        self::assertSame([$workload->getId() => 4], $own);
    }
}
