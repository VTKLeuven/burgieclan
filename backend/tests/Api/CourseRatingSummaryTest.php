<?php

namespace App\Tests\Api;

use App\Constants\AcademicYear;
use App\Controller\Api\GetCourseRatingSummaryController;
use App\Entity\CommentCategory;
use App\Entity\Course;
use App\Factory\CommentCategoryFactory;
use App\Factory\CourseFactory;
use App\Factory\CourseRatingFactory;
use App\Factory\UserFactory;
use App\Repository\CourseRatingRepository;

/**
 * The read side of the ratings: two scores per section, each with its sample size.
 *
 * A single recency-weighted average would be one clean number nobody could explain, and these
 * scores affect how professors are seen - so recent and all-time are shown side by side and the
 * arithmetic stays something you can point at.
 */
class CourseRatingSummaryTest extends ApiTestCase
{
    private function ratedCategory(): CommentCategory
    {
        return CommentCategoryFactory::createOne(['type' => CommentCategory::TYPE_RATED]);
    }

    private function rate(Course $course, CommentCategory $category, int $value, string $year): void
    {
        CourseRatingFactory::createOne(
            [
            'course' => $course,
            'category' => $category,
            'value' => $value,
            'academicYear' => $year,
            'creator' => UserFactory::createOne(),
            ]
        );
    }

    private function summary(Course $course): array
    {
        return $this->browser()
            ->get(
                '/api/courses/' . $course->getId() . '/ratings',
                [
                'headers' => ['Authorization' => 'Bearer ' . $this->token],
                ]
            )
            ->assertStatus(200)
            ->json()
            ->decoded();
    }

    public function testRecentAndAllTimeAreScoredSeparately(): void
    {
        $course = CourseFactory::createOne();
        $category = $this->ratedCategory();

        foreach ([5, 5, 5] as $value) {
            $this->rate($course, $category, $value, AcademicYear::current());
        }
        foreach ([1, 1, 1] as $value) {
            $this->rate($course, $category, $value, '2014 - 2015');
        }

        $section = $this->summary($course)['sections'][0];

        // Cast: a whole-number average serialises as 5, not 5.0, and decodes back as an int.
        self::assertSame(
            5.0,
            (float) $section['recent']['average'],
            'The old scores must not drag the recent one down.'
        );
        self::assertSame(3, $section['recent']['count']);
        self::assertSame(3.0, (float) $section['allTime']['average']);
        self::assertSame(6, $section['allTime']['count']);
    }

    public function testTheWindowIsThreeAcademicYearsAndSaysSo(): void
    {
        $course = CourseFactory::createOne();
        $this->ratedCategory();

        $summary = $this->summary($course);

        // Returned rather than assumed, so the client can label the score with the window it
        // covers instead of hardcoding the same number somewhere else.
        self::assertCount(GetCourseRatingSummaryController::RECENT_YEARS, $summary['recentYears']);
        self::assertSame(AcademicYear::current(), $summary['recentYears'][0]);
    }

    public function testAThinScoreReportsItsCountButNotAnAverage(): void
    {
        $course = CourseFactory::createOne();
        $category = $this->ratedCategory();
        $this->rate($course, $category, 5, AcademicYear::current());

        $section = $this->summary($course)['sections'][0];

        self::assertSame(1, $section['count'] ?? $section['allTime']['count']);
        self::assertNull(
            $section['allTime']['average'],
            'Below the threshold the average is withheld here, not left for the client to hide.'
        );
    }

    /**
     * Without this a course nobody has rated would show no stars, and there would be no way to
     * be the first person to rate it.
     */
    public function testANeverRatedCourseStillListsItsRatedSections(): void
    {
        $course = CourseFactory::createOne();
        $this->ratedCategory();
        $this->ratedCategory();

        $summary = $this->summary($course);

        self::assertCount(2, $summary['sections']);
        self::assertSame(0, $summary['sections'][0]['allTime']['count']);
        self::assertNull($summary['sections'][0]['currentUserRating']);
    }

    public function testDiscussionSectionsAreNotListed(): void
    {
        $course = CourseFactory::createOne();
        CommentCategoryFactory::createOne(['type' => CommentCategory::TYPE_DISCUSSION]);
        $this->ratedCategory();

        self::assertCount(1, $this->summary($course)['sections']);
    }

    public function testTheStarsComeBackFilledInForWhoeverGaveThem(): void
    {
        $course = CourseFactory::createOne();
        $category = $this->ratedCategory();

        $this->browser()->post(
            '/api/course_ratings',
            [
            'headers' => ['Authorization' => 'Bearer ' . $this->token, 'Content-Type' => 'application/ld+json'],
            'json' => [
                'course' => '/api/courses/' . $course->getId(),
                'category' => '/api/comment_categories/' . $category->getId(),
                'value' => 3,
            ],
            ]
        )->assertStatus(201);

        // Somebody else's score on the same axis must not show up as this user's.
        $this->rate($course, $category, 5, AcademicYear::current());

        $section = $this->summary($course)['sections'][0];
        self::assertSame(3, $section['currentUserRating']);
    }

    public function testTheYearBreakdownExplainsWhyTheTwoScoresDiffer(): void
    {
        $course = CourseFactory::createOne();
        $category = $this->ratedCategory();

        $this->rate($course, $category, 5, AcademicYear::current());
        $this->rate($course, $category, 1, '2014 - 2015');

        $byYear = $this->summary($course)['sections'][0]['byYear'];

        self::assertSame([AcademicYear::current(), '2014 - 2015'], array_column($byYear, 'year'));
    }

    public function testAMissingCourseIsNotFound(): void
    {
        $this->browser()
            ->get(
                '/api/courses/99999999/ratings',
                [
                'headers' => ['Authorization' => 'Bearer ' . $this->token],
                ]
            )
            ->assertStatus(404);
    }
}
