<?php

namespace App\Tests\Api;

use App\Constants\AcademicYear;
use App\Entity\CourseComment;
use App\Factory\CommentCategoryFactory;
use App\Factory\CourseCommentFactory;
use App\Factory\CourseFactory;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Course comments come back newest academic year first, oldest comment first inside a year.
 *
 * The direction is deliberately mixed and easy to "correct" by mistake, so it is pinned here.
 * The within-year direction matters most for migrated wiki comments: 91.6% of the imported
 * rows share a createdAt with a sibling, so `id` is what actually orders them, and flipping it
 * would reverse the bullets of every migrated section.
 */
class CourseCommentOrderingTest extends ApiTestCase
{
    public function testCommentsAreOrderedByAcademicYearThenOldestFirst(): void
    {
        $course = CourseFactory::createOne();
        $category = CommentCategoryFactory::createOne();

        // One shared timestamp on purpose: this is the shape the migrated data actually has,
        // and a fixture with distinct timestamps would pass while production stayed broken.
        $sharedMoment = new \DateTimeImmutable('2026-01-01 12:00:00');

        $make = function (?string $year) use ($course, $category, $sharedMoment): CourseComment {
            $comment = CourseCommentFactory::createOne(
                [
                'course' => $course,
                'category' => $category,
                'academicYear' => $year,
                'anonymous' => false,
                ]
            );

            // createdAt is set by a lifecycle callback and has no setter, so it has to be
            // forced. Giving every comment the same instant is the point of the test.
            $reflection = new \ReflectionProperty($comment, 'createdAt');
            $reflection->setValue($comment, $sharedMoment);

            return $comment;
        };

        $olderFirst = $make('2023 - 2024');
        $newerFirst = $make('2025 - 2026');
        $newerSecond = $make('2025 - 2026');
        $undated = $make(null);

        /** @var EntityManagerInterface $entityManager */
        $entityManager = static::getContainer()->get(EntityManagerInterface::class);
        $entityManager->flush();
        $entityManager->clear();

        $this->browser()
            ->get('/api/courses/' . $course->getId(), ['headers' => ['Authorization' => 'Bearer ' . $this->token]])
            ->assertStatus(200)
            ->use(
                function (\Zenstruck\Browser\Json $json) use ($newerFirst, $newerSecond, $olderFirst, $undated) {
                    $ids = array_map(
                        static fn(string $iri): int => (int) substr($iri, (int) strrpos($iri, '/') + 1),
                        $json->decoded()['courseComments'] === []
                        ? []
                        : array_column($json->decoded()['courseComments'], '@id')
                    );

                    self::assertSame(
                        [$newerFirst->getId(), $newerSecond->getId(), $olderFirst->getId(), $undated->getId()],
                        $ids,
                        'Newest year first; inside a year the oldest comment leads; undated comments last.'
                    );
                }
            );
    }

    public function testANewCommentGetsTheCurrentAcademicYearWithoutBeingAsked(): void
    {
        $course = CourseFactory::createOne();
        $category = CommentCategoryFactory::createOne();

        $this->browser()
            ->post(
                '/api/course_comments',
                [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token,
                    'Content-Type' => 'application/ld+json',
                ],
                'json' => [
                    'content' => 'Zware puntenverdeling, maar goed te doen.',
                    'anonymous' => false,
                    'course' => '/api/courses/' . $course->getId(),
                    'category' => '/api/comment_categories/' . $category->getId(),
                ],
                ]
            )
            ->assertStatus(201)
            ->assertJsonMatches('academicYear', AcademicYear::current());
    }

    public function testAMalformedAcademicYearIsRejected(): void
    {
        $course = CourseFactory::createOne();
        $category = CommentCategoryFactory::createOne();

        $this->browser()
            ->post(
                '/api/course_comments',
                [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token,
                    'Content-Type' => 'application/ld+json',
                ],
                'json' => [
                    'content' => 'Verkeerd jaarformaat.',
                    'anonymous' => false,
                    'academicYear' => '2021',
                    'course' => '/api/courses/' . $course->getId(),
                    'category' => '/api/comment_categories/' . $category->getId(),
                ],
                ]
            )
            ->assertStatus(422);
    }
}
