<?php

namespace App\Tests\Api;

use App\Constants\Feature;
use App\Constants\NotificationType;
use App\Entity\Course;
use App\Entity\Exam;
use App\Entity\User;
use App\Factory\CourseCommentFactory;
use App\Factory\CourseFactory;
use App\Factory\DocumentFactory;
use App\Factory\ExamFactory;
use App\Factory\UserFactory;
use App\Service\Collab\CollabDocumentStore;
use DateTimeImmutable;
use Doctrine\ORM\EntityManagerInterface;
use Zenstruck\Browser\HttpOptions;
use Zenstruck\Browser\KernelBrowser;

/**
 * Following a course is having it among your favourites; its followers hear about new documents,
 * comments, reconstructions and exam questions, except about what they did themselves.
 */
class NotificationTest extends ApiTestCase
{
    private function entityManager(): EntityManagerInterface
    {
        return self::getContainer()->get(EntityManagerInterface::class);
    }

    private function follower(Course $course, bool $muted = false): User
    {
        $user = UserFactory::createOne(['plainPassword' => 'password']);
        $user->addFavoriteCourse($course);
        if ($muted) {
            $user->muteCourse($course);
        }
        $this->entityManager()->flush();

        return $user;
    }

    /**
     * @return list<array{type: string, count: int, read: bool}>
     */
    private function notificationsOf(User $user, ?NotificationType $type = null): array
    {
        $sql = 'SELECT type, count, read_at IS NOT NULL AS read FROM notification WHERE user_id = :user';
        $params = ['user' => $user->getId()];
        if (null !== $type) {
            $sql .= ' AND type = :type';
            $params['type'] = $type->value;
        }

        return array_map(
            static fn (array $row): array => ['type' => $row['type'], 'count' => (int) $row['count'], 'read' => (bool) $row['read']],
            $this->entityManager()->getConnection()->fetchAllAssociative($sql . ' ORDER BY id', $params)
        );
    }

    /**
     * @param list<string> $uids
     *
     * @return array<string, mixed> TipTap JSON with one examQuestion per uid
     */
    private static function questions(array $uids): array
    {
        $nodes = [];
        foreach ($uids as $uid) {
            $nodes[] = [
                'type' => 'examQuestion',
                'attrs' => ['id' => $uid, 'sittings' => []],
                'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'Vraag ' . $uid]]]],
            ];
        }

        return ['type' => 'doc', 'content' => $nodes];
    }

    /**
     * @param list<string> $uids
     * @param int[] $contributors
     */
    private function store(Exam $exam, array $uids, array $contributors, ?DateTimeImmutable $now = null): void
    {
        self::getContainer()->get(CollabDocumentStore::class)
            ->store($exam->getDocumentName(), 'state-' . implode('-', $uids), self::questions($uids), null, $contributors, $now);
    }

    private function as(User $user): KernelBrowser
    {
        $token = $this->getToken($user->getUsername(), 'password');

        return $this->browser()->setDefaultHttpOptions(
            HttpOptions::create()->withHeader('Authorization', 'Bearer ' . $token)
        );
    }

    public function testApprovingADocumentNotifiesFollowersButNotItsUploaderOrWhoMutedTheCourse(): void
    {
        $course = CourseFactory::createOne();
        $follower = $this->follower($course);
        $muted = $this->follower($course, muted: true);
        $uploader = $this->follower($course);
        $stranger = UserFactory::createOne();

        $document = DocumentFactory::createOne(['course' => $course, 'creator' => $uploader, 'under_review' => true]);

        $this->assertSame([], $this->notificationsOf($follower), 'An upload waiting for review is not news yet.');

        $document->setUnderReview(false);
        $this->entityManager()->flush();

        $this->assertSame([['type' => 'document', 'count' => 1, 'read' => false]], $this->notificationsOf($follower));
        $this->assertSame([], $this->notificationsOf($muted));
        $this->assertSame([], $this->notificationsOf($uploader));
        $this->assertSame([], $this->notificationsOf($stranger));

        // Editing an approved document again is no new document.
        $document->setName('Andere naam');
        $this->entityManager()->flush();
        $this->assertCount(1, $this->notificationsOf($follower));
    }

    public function testADocumentWithoutReviewNotifiesAtOnce(): void
    {
        $course = CourseFactory::createOne();
        $follower = $this->follower($course);

        DocumentFactory::createOne(['course' => $course, 'creator' => UserFactory::createOne(), 'under_review' => false]);

        $this->assertSame([['type' => 'document', 'count' => 1, 'read' => false]], $this->notificationsOf($follower));
    }

    public function testCommentsAndReconstructionsNotifyFollowers(): void
    {
        $course = CourseFactory::createOne();
        $follower = $this->follower($course);
        $author = $this->follower($course);

        CourseCommentFactory::createOne(['course' => $course, 'creator' => $author]);
        ExamFactory::createOne(['course' => $course, 'creator' => $author]);

        $this->assertSame(
            [['type' => 'course_comment', 'count' => 1, 'read' => false], ['type' => 'exam', 'count' => 1, 'read' => false]],
            $this->notificationsOf($follower)
        );
        $this->assertSame([], $this->notificationsOf($author));
    }

    public function testNewQuestionsAreBundledPerExamPerDayAndSkipWhoWroteThem(): void
    {
        $course = CourseFactory::createOne();
        $follower = $this->follower($course);
        $writer = $this->follower($course);
        $exam = ExamFactory::createOne(['course' => $course, 'creator' => UserFactory::createOne()]);
        $today = new DateTimeImmutable('today 10:00', new \DateTimeZone('Europe/Brussels'));

        $this->store($exam, ['a', 'b'], [$writer->getId()], $today);
        $this->store($exam, ['a', 'b', 'c'], [$writer->getId()], $today->modify('+1 hour'));
        // Storing the same questions again, or one coming back, is nothing new.
        $this->store($exam, ['a', 'b', 'c'], [$writer->getId()], $today->modify('+2 hours'));

        $this->assertSame([['type' => 'exam_questions', 'count' => 3, 'read' => false]], $this->notificationsOf($follower, NotificationType::EXAM_QUESTIONS));
        $this->assertSame([], $this->notificationsOf($writer, NotificationType::EXAM_QUESTIONS));

        // Once read, the next question starts a new notification, and so does the next day.
        $this->as($follower)->post('/api/notifications/read')->assertStatus(204);
        $this->store($exam, ['a', 'b', 'c', 'd'], [$writer->getId()], $today->modify('+3 hours'));
        $this->store($exam, ['a', 'b', 'c', 'd', 'e'], [$writer->getId()], $today->modify('+1 day'));

        $this->assertSame(
            [
                ['type' => 'exam_questions', 'count' => 3, 'read' => true],
                ['type' => 'exam_questions', 'count' => 1, 'read' => false],
                ['type' => 'exam_questions', 'count' => 1, 'read' => false],
            ],
            $this->notificationsOf($follower, NotificationType::EXAM_QUESTIONS)
        );
    }

    public function testTheListShowsWhatTheUserMaySeeAndCanBeMarkedRead(): void
    {
        $course = CourseFactory::createOne(['name' => 'Mechanica', 'code' => 'H01A0B']);
        $follower = $this->follower($course);
        $someone = UserFactory::createOne();

        $hidden = DocumentFactory::createOne(['course' => $course, 'creator' => $someone, 'under_review' => false]);
        DocumentFactory::createOne(['course' => $course, 'creator' => $someone, 'under_review' => false, 'name' => 'Samenvatting H3']);
        CourseCommentFactory::createOne(['course' => $course, 'creator' => $someone, 'content' => '<p>Maak   alle oefeningen</p>']);
        ExamFactory::createOne(['course' => $course, 'creator' => $someone]);

        // Back in review: students cannot open it, so it is not shown either.
        $hidden->setUnderReview(true);
        $this->entityManager()->flush();

        // Reconstructions are switched off: nothing about exams.
        $body = $this->as($follower)->get('/api/notifications')->assertStatus(200)->json()->decoded();
        $this->assertSame(2, $body['unreadCount']);
        $this->assertSame(['course_comment', 'document'], array_map(static fn (array $item): string => $item['type'], $body['items']));
        $this->assertSame('Maak alle oefeningen', $body['items'][0]['comment']['excerpt']);
        $this->assertSame('Samenvatting H3', $body['items'][1]['document']['name']);
        $this->assertSame(['id' => $course->getId(), 'code' => 'H01A0B', 'name' => 'Mechanica', 'nameNl' => $course->getNameNl(), 'nameEn' => $course->getNameEn()], $body['items'][1]['course']);
        $this->assertArrayNotHasKey('creator', $body['items'][0]);

        self::enableFeature(Feature::EXAM_RECONSTRUCTIONS);
        $body = $this->as($follower)->get('/api/notifications')->json()->decoded();
        $this->assertSame(3, $body['unreadCount']);
        $this->assertSame('exam', $body['items'][0]['type']);

        $this->as($follower)->post('/api/notifications/read')->assertStatus(204);
        $body = $this->as($follower)->get('/api/notifications')->json()->decoded();
        $this->assertSame(0, $body['unreadCount']);
        $this->assertTrue($body['items'][0]['read']);
    }

    public function testMutingACourse(): void
    {
        $course = CourseFactory::createOne();
        $follower = $this->follower($course);
        $browser = $this->as($follower);

        $browser->put('/api/notifications/muted_courses/' . $course->getId(), HttpOptions::json(['muted' => true]))->assertStatus(204);
        $this->assertSame([$course->getId()], $browser->get('/api/notifications')->json()->decoded()['mutedCourseIds']);

        DocumentFactory::createOne(['course' => $course, 'creator' => UserFactory::createOne(), 'under_review' => false]);
        $this->assertSame([], $this->notificationsOf($follower));

        $browser->put('/api/notifications/muted_courses/' . $course->getId(), HttpOptions::json(['muted' => false]))->assertStatus(204);
        $this->assertSame([], $browser->get('/api/notifications')->json()->decoded()['mutedCourseIds']);

        $browser->put('/api/notifications/muted_courses/' . $course->getId(), HttpOptions::json(['muted' => 'yes']))->assertStatus(400);
        $browser->put('/api/notifications/muted_courses/999999', HttpOptions::json(['muted' => true]))->assertStatus(404);
    }

    public function testRequiresLogin(): void
    {
        $this->browser()->get('/api/notifications')->assertStatus(401);
        $this->browser()->post('/api/notifications/read')->assertStatus(401);
    }
}
