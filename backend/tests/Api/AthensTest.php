<?php

namespace App\Tests\Api;

use App\Constants\Feature;
use App\Entity\AthensCourse;
use App\Entity\AthensCourseInterest;
use App\Entity\AthensReview;
use App\Entity\User;
use App\Factory\UserFactory;
use App\Service\Exchange\AthensCatalogue;
use Doctrine\ORM\EntityManagerInterface;
use InvalidArgumentException;
use Zenstruck\Browser\HttpOptions;
use Zenstruck\Browser\KernelBrowser;

/**
 * ATHENS: the yearly catalogue import hides courses that left without losing their reviews, a
 * review waits for a moderator, and a student's stars are theirs alone.
 */
class AthensTest extends ApiTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        self::enableFeature(Feature::EXCHANGE);
    }

    private function entityManager(): EntityManagerInterface
    {
        return self::getContainer()->get(EntityManagerInterface::class);
    }

    private function catalogue(): AthensCatalogue
    {
        return self::getContainer()->get(AthensCatalogue::class);
    }

    /**
     * A catalogue with these courses, as [code, university, title, programs], at TU Delft ("tud") and UPM ("upm").
     *
     * @param list<array{string, string, string, list<string>}> $courses
     *
     * @return array<string, mixed>
     */
    private static function edition(string $edition, array $courses): array
    {
        return [
            'edition' => $edition,
            'published' => '2026-09-07',
            'source' => 'https://example.org/catalogue.pdf',
            'sessions' => [['start' => '2027-03-13', 'end' => '2027-03-20', 'registrationOpens' => '2027-01']],
            'universities' => [
                'tud' => ['name' => 'TU Delft', 'city' => 'Delft', 'country' => 'NL'],
                'upm' => ['name' => 'Universidad Politécnica de Madrid', 'city' => 'Madrid', 'country' => 'ES'],
            ],
            'courses' => array_map(
                static fn (array $course): array => ['code' => $course[0], 'university' => $course[1], 'title' => $course[2], 'evaluation' => 'Project work', 'programs' => $course[3]],
                $courses
            ),
        ];
    }

    /**
     * @param array<string, mixed> $data
     *
     * @return array{added: list<string>, returned: list<string>, updated: list<string>, hidden: list<string>, unchanged: int}
     */
    private function import(array $data): array
    {
        $file = tempnam(sys_get_temp_dir(), 'athens');
        file_put_contents($file, json_encode($data));
        try {
            return $this->catalogue()->import($this->catalogue()->read($file));
        } finally {
            unlink($file);
        }
    }

    private function course(string $code): AthensCourse
    {
        $course = $this->entityManager()->getRepository(AthensCourse::class)->findOneBy(['code' => $code]);
        $this->assertNotNull($course, $code);

        return $course;
    }

    private function review(AthensCourse $course, User $author, bool $underReview = false): AthensReview
    {
        $review = (new AthensReview($course, $author))
            ->setSession('2025-11')->setProgram('CW')->setRating(4)
            ->setSections(['course' => 'Leerrijk.', 'city' => 'Mooie stad.'])
            ->setUnderReview($underReview);
        $this->entityManager()->persist($review);
        $this->entityManager()->flush();

        return $review;
    }

    private function auth(?string $token = null): array
    {
        return ['headers' => ['Authorization' => 'Bearer ' . ($token ?? $this->token)]];
    }

    /** @param array<string, mixed> $body */
    private function post(array $body, ?string $token = null): KernelBrowser
    {
        return $this->browser()->post(
            '/api/exchange/athens/reviews',
            HttpOptions::json($body)->withHeader('Authorization', 'Bearer ' . ($token ?? $this->token))
        );
    }

    private function otherToken(): string
    {
        return $this->getToken(UserFactory::createOne(['plainPassword' => 'password'])->getUsername(), 'password');
    }

    public function testTheRoutesAreNotFoundWhileTheFeatureIsOff(): void
    {
        $this->entityManager()->getConnection()->executeStatement('DELETE FROM feature_flag');

        $this->browser()->get('/api/exchange/athens', $this->auth())->assertStatus(404);
    }

    public function testTheCatalogueInTheRepositoryIsValid(): void
    {
        $catalogue = $this->catalogue()->read();

        $this->assertMatchesRegularExpression('/^\d{4}-\d{4}$/', $catalogue['edition']);
        $this->assertGreaterThan(100, count($catalogue['courses']));
    }

    public function testACourseThatLeavesIsHiddenWithItsReviewsAndComesBack(): void
    {
        $this->import(self::edition('2026-2027', [['TUD01', 'tud', 'Bridges', ['BWK']], ['UPM10', 'upm', 'Pneumatic Architecture', ['ARCH']]]));
        $bridges = $this->course('TUD01');
        $this->review($bridges, UserFactory::createOne());

        // Next year Bridges is not offered.
        $result = $this->import(self::edition('2027-2028', [['UPM10', 'upm', 'Pneumatic Architecture', ['ARCH']]]));
        $this->assertCount(1, $result['hidden']);
        $this->assertSame(1, $result['unchanged']);

        $overview = $this->browser()->get('/api/exchange/athens', $this->auth())->assertStatus(200)->json()->decoded();
        $this->assertSame(['UPM10'], array_column($overview['courses'], 'code'));
        // Still reachable, marked as gone, with its review.
        $detail = $this->browser()->get('/api/exchange/athens/courses/' . $bridges->getId(), $this->auth())->json()->decoded();
        $this->assertFalse($detail['course']['active']);
        $this->assertCount(1, $detail['reviews']);

        // A year later it is back, under a new code: the same course, with its review.
        $result = $this->import(self::edition('2028-2029', [['TUD07', 'tud', 'Bridges', ['BWK', 'WTK']], ['UPM10', 'upm', 'Pneumatic Architecture', ['ARCH']]]));
        $this->assertCount(1, $result['returned']);
        $this->assertSame([], $result['added']);

        $overview = $this->browser()->get('/api/exchange/athens', $this->auth())->json()->decoded();
        $back = array_values(array_filter($overview['courses'], static fn (array $course): bool => 'TUD07' === $course['code']))[0];
        $this->assertSame($bridges->getId(), $back['id']);
        $this->assertSame(1, $back['reviewCount']);
        $this->assertSame(['BWK', 'WTK'], $back['programs']);
    }

    public function testATypoFixKeepsTheCourseAndTheSameTitleUnderTwoCodesStaysTwo(): void
    {
        $this->import(
            self::edition(
                '2026-2027',
                [
                ['UPM195', 'upm', 'Venue Desing', ['ARCH']],
                ['UPM135', 'upm', 'Pneumatic Architecture', ['ARCH']],
                ['UPM180', 'upm', 'Pneumatic Architecture', ['ARCH', 'BWK']],
                ]
            )
        );
        $venue = $this->course('UPM195')->getId();

        $result = $this->import(
            self::edition(
                '2027-2028',
                [
                ['UPM195', 'upm', 'Venue Design', ['ARCH']],
                ['UPM135', 'upm', 'Pneumatic Architecture', ['ARCH']],
                ['UPM180', 'upm', 'Pneumatic Architecture', ['ARCH', 'BWK']],
                ]
            )
        );

        $this->assertSame([], $result['added']);
        $this->assertSame([], $result['hidden']);
        $this->assertCount(1, $result['updated']);
        $this->assertSame($venue, $this->course('UPM195')->getId());
        $this->assertSame('Venue Design', $this->course('UPM195')->getTitle());
        $this->assertNotSame($this->course('UPM135')->getId(), $this->course('UPM180')->getId());
    }

    public function testABrokenCatalogueIsRefusedWithReasons(): void
    {
        $data = self::edition('2026-2027', [['X1', 'nowhere', 'Ghost course', ['XYZ']]]);

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/unknown university "nowhere".*programme codes/s');
        $this->import($data);
    }

    public function testAReviewWaitsForAModerator(): void
    {
        $this->import(self::edition('2026-2027', [['TUD01', 'tud', 'Bridges', ['BWK']]]));
        $course = $this->course('TUD01');

        $created = $this->post(
            [
            'courseId' => $course->getId(),
            'session' => '2025-11',
            'program' => 'BWK',
            'rating' => 5,
            'sections' => ['course' => 'Heel goed.', 'exam' => ''],
            'contactable' => true,
            ]
        )->assertStatus(201)->json()->decoded();

        $mine = $this->browser()->get('/api/exchange/athens/courses/' . $course->getId(), $this->auth())->json()->decoded();
        $this->assertCount(1, $mine['reviews']);
        $this->assertTrue($mine['reviews'][0]['underReview']);
        $this->assertSame(['course' => 'Heel goed.'], $mine['reviews'][0]['sections']);

        $other = $this->otherToken();
        $before = $this->browser()->get('/api/exchange/athens/courses/' . $course->getId(), $this->auth($other))->json()->decoded();
        $this->assertSame([], $before['reviews']);

        $this->entityManager()->find(AthensReview::class, $created['id'])->setUnderReview(false);
        $this->entityManager()->flush();

        $after = $this->browser()->get('/api/exchange/athens', $this->auth($other))->json()->decoded();
        $this->assertSame(1, $after['courses'][0]['reviewCount']);
        $this->assertEquals(5, $after['courses'][0]['rating']);
        $this->assertCount(1, $after['recent']);

        // One review per course.
        $this->post(['courseId' => $course->getId(), 'session' => '2026-03', 'program' => 'BWK', 'rating' => 3, 'sections' => ['course' => 'Nog eens.']])
            ->assertStatus(422);
    }

    public function testInvalidReviewsAreRefused(): void
    {
        $this->import(self::edition('2026-2027', [['TUD01', 'tud', 'Bridges', ['BWK']]]));
        $valid = ['courseId' => $this->course('TUD01')->getId(), 'session' => '2025-11', 'program' => 'BWK', 'rating' => 4, 'sections' => ['course' => 'Goed.']];

        $this->post(['session' => '2025-04'] + $valid)->assertStatus(422);
        $this->post(['session' => '2099-11'] + $valid)->assertStatus(422);
        $this->post(['rating' => 6] + $valid)->assertStatus(422);
        $this->post(['program' => 'XYZ'] + $valid)->assertStatus(422);
        $this->post(['sections' => ['course' => '  ']] + $valid)->assertStatus(422);
        $this->post(['courseId' => 999999] + $valid)->assertStatus(422);
    }

    public function testOnlyTheAuthorDeletesAReview(): void
    {
        $this->import(self::edition('2026-2027', [['TUD01', 'tud', 'Bridges', ['BWK']]]));
        $review = $this->review($this->course('TUD01'), UserFactory::createOne());

        $this->browser()->delete('/api/exchange/athens/reviews/' . $review->getId(), $this->auth())->assertStatus(403);
    }

    public function testStarsAreOnlyEverSeenByTheirOwner(): void
    {
        $this->import(self::edition('2026-2027', [['TUD01', 'tud', 'Bridges', ['BWK']]]));
        $id = $this->course('TUD01')->getId();

        $this->browser()->put('/api/exchange/athens/courses/' . $id . '/stars', HttpOptions::json(['stars' => 4])->withHeader('Authorization', 'Bearer ' . $this->token))
            ->assertStatus(204);
        $this->browser()->put('/api/exchange/athens/courses/' . $id . '/stars', HttpOptions::json(['stars' => 7])->withHeader('Authorization', 'Bearer ' . $this->token))
            ->assertStatus(400);

        $mine = $this->browser()->get('/api/exchange/athens', $this->auth())->json()->decoded();
        $this->assertSame(4, $mine['courses'][0]['myStars']);
        $detail = $this->browser()->get('/api/exchange/athens/courses/' . $id, $this->auth())->json()->decoded();
        $this->assertSame(4, $detail['course']['myStars']);

        $theirs = $this->browser()->get('/api/exchange/athens', $this->auth($this->otherToken()))->json()->decoded();
        $this->assertNull($theirs['courses'][0]['myStars']);
        // Stars never feed the public score.
        $this->assertNull($theirs['courses'][0]['rating']);

        // Cleared, and kept when the course leaves the catalogue.
        $this->browser()->put('/api/exchange/athens/courses/' . $id . '/stars', HttpOptions::json(['stars' => 2])->withHeader('Authorization', 'Bearer ' . $this->token));
        $this->import(self::edition('2027-2028', [['UPM10', 'upm', 'Pneumatic Architecture', ['ARCH']]]));
        $this->assertSame(1, $this->entityManager()->getRepository(AthensCourseInterest::class)->count(['course' => $id]));
        $this->browser()->put('/api/exchange/athens/courses/' . $id . '/stars', HttpOptions::json(['stars' => null])->withHeader('Authorization', 'Bearer ' . $this->token))
            ->assertStatus(204);
        $this->assertSame(0, $this->entityManager()->getRepository(AthensCourseInterest::class)->count(['course' => $id]));
    }
}
