<?php

namespace App\Tests\Api;

use App\Constants\AcademicYear;
use App\Entity\CommentCategory;
use App\Entity\CourseRating;
use App\Factory\CommentCategoryFactory;
use App\Factory\CourseFactory;
use App\Factory\UserFactory;
use App\Repository\CourseRatingRepository;

class CourseRatingResourceTest extends ApiTestCase
{
    private function ratedCategory(): CommentCategory
    {
        return CommentCategoryFactory::createOne(
            [
            'type' => CommentCategory::TYPE_RATED,
            'rating_low_label_nl' => 'licht',
            'rating_high_label_nl' => 'zwaar',
            ]
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(int $courseId, int $categoryId, int $value, ?string $year = null): array
    {
        $json = [
            'course' => '/api/courses/' . $courseId,
            'category' => '/api/comment_categories/' . $categoryId,
            'value' => $value,
        ];
        if (null !== $year) {
            $json['academicYear'] = $year;
        }

        return [
            'headers' => ['Authorization' => 'Bearer ' . $this->token, 'Content-Type' => 'application/ld+json'],
            'json' => $json,
        ];
    }

    public function testARatingDefaultsToTheCurrentAcademicYear(): void
    {
        $course = CourseFactory::createOne();
        $category = $this->ratedCategory();

        $this->browser()
            ->post('/api/course_ratings', $this->payload($course->getId(), $category->getId(), 4))
            ->assertStatus(201)
            ->assertJsonMatches('value', 4)
            ->assertJsonMatches('academicYear', AcademicYear::current());
    }

    /**
     * The whole reason the table has a unique index rather than being a log: a rating is one
     * replaceable value per person, so scoring twice is an edit and the average stays stable.
     */
    public function testRatingTwiceReplacesTheScoreInsteadOfAddingOne(): void
    {
        $course = CourseFactory::createOne();
        $category = $this->ratedCategory();

        $this->browser()
            ->post('/api/course_ratings', $this->payload($course->getId(), $category->getId(), 5))
            ->assertStatus(201)
            ->post('/api/course_ratings', $this->payload($course->getId(), $category->getId(), 2))
            ->assertStatus(201)
            ->assertJsonMatches('value', 2);

        /** @var CourseRatingRepository $repository */
        $repository = static::getContainer()->get(CourseRatingRepository::class);
        self::assertCount(1, $repository->findBy(['course' => $course]));
    }

    /**
     * Two people rating the same axis must not collide. The row is resolved from the signed-in
     * user, so there is no request shape that reaches somebody else's score.
     */
    public function testOneStudentCannotOverwriteAnothersRating(): void
    {
        $course = CourseFactory::createOne();
        $category = $this->ratedCategory();

        $this->browser()
            ->post('/api/course_ratings', $this->payload($course->getId(), $category->getId(), 5))
            ->assertStatus(201);

        $other = UserFactory::createOne(['plainPassword' => 'password']);
        $otherToken = $this->getToken($other->getUsername(), 'password');

        $payload = $this->payload($course->getId(), $category->getId(), 1);
        $payload['headers']['Authorization'] = 'Bearer ' . $otherToken;

        $this->browser()->post('/api/course_ratings', $payload)->assertStatus(201);

        /** @var CourseRatingRepository $repository */
        $repository = static::getContainer()->get(CourseRatingRepository::class);
        $ratings = $repository->findBy(['course' => $course]);

        self::assertCount(2, $ratings, 'Each student keeps their own score.');
        self::assertEqualsCanonicalizing(
            [5, 1],
            array_map(
                static fn(CourseRating $rating): int => $rating->getValue(),
                $ratings
            )
        );
    }

    public function testASectionWithoutAScaleCannotBeRated(): void
    {
        $course = CourseFactory::createOne();
        $discussion = CommentCategoryFactory::createOne(['type' => CommentCategory::TYPE_DISCUSSION]);

        $this->browser()
            ->post('/api/course_ratings', $this->payload($course->getId(), $discussion->getId(), 4))
            ->assertStatus(422);
    }

    public function testAScoreOutsideTheScaleIsRejected(): void
    {
        $course = CourseFactory::createOne();
        $category = $this->ratedCategory();

        $this->browser()
            ->post('/api/course_ratings', $this->payload($course->getId(), $category->getId(), 9))
            ->assertStatus(422);

        $this->browser()
            ->post('/api/course_ratings', $this->payload($course->getId(), $category->getId(), 0))
            ->assertStatus(422);
    }
}
