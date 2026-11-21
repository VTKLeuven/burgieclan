<?php

namespace App\Service\Notification;

use App\Constants\NotificationType;
use App\Entity\Course;
use App\Entity\CourseComment;
use App\Entity\Document;
use App\Entity\Exam;
use DateTimeImmutable;
use DateTimeZone;
use Doctrine\DBAL\Connection;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Tells the followers of a course that something new appeared in it.
 *
 * Following a course is having it among your favourites ("Mijn vakken"), unless you switched its
 * notifications off (User::$mutedCourses). The people who caused the change are left out, so
 * nobody hears about their own upload, comment or questions.
 *
 * Writes through DBAL, one statement for every follower at once, so a course with hundreds of
 * followers costs one query rather than hundreds of entities. The entity listeners call it from
 * inside a flush, on the same connection, so a notification and what it is about are stored or
 * rolled back together. CollabDocumentStore calls it right after its flush instead.
 */
class CourseNotifier
{
    private const BRUSSELS = 'Europe/Brussels';

    public function __construct(
        private readonly EntityManagerInterface $entityManager,
    ) {}

    /** @param int[] $excludedUserIds */
    public function documentAdded(Document $document, array $excludedUserIds): void
    {
        $this->insert($document->getCourse(), NotificationType::DOCUMENT, $excludedUserIds, document: $document);
    }

    /** @param int[] $excludedUserIds */
    public function courseCommentAdded(CourseComment $comment, array $excludedUserIds): void
    {
        $this->insert($comment->getCourse(), NotificationType::COURSE_COMMENT, $excludedUserIds, comment: $comment);
    }

    /** @param int[] $excludedUserIds */
    public function examStarted(Exam $exam, array $excludedUserIds): void
    {
        $this->insert($exam->getCourse(), NotificationType::EXAM, $excludedUserIds, exam: $exam);
    }

    /**
     * New questions in a reconstruction. Editors store every few seconds while they type, so
     * these are bundled: one notification per follower per exam per (Brussels) day, counting up,
     * as long as it is unread. Once read, the next question starts a new one.
     *
     * @param int[] $excludedUserIds
     */
    public function questionsAdded(Exam $exam, int $count, array $excludedUserIds, ?DateTimeImmutable $now = null): void
    {
        if ($count < 1) {
            return;
        }

        $now ??= new DateTimeImmutable();
        $startOfDay = $now->setTimezone(new DateTimeZone(self::BRUSSELS))
            ->setTime(0, 0)
            ->setTimezone($now->getTimezone());

        $connection = $this->connection();
        $bundle = 'n.type = :type AND n.exam_id = :exam AND n.read_at IS NULL AND n.created_at >= :startOfDay';
        $params = [
            'course' => $exam->getCourse()->getId(),
            'type' => NotificationType::EXAM_QUESTIONS->value,
            'exam' => $exam->getId(),
            'startOfDay' => self::format($startOfDay),
            'now' => self::format($now),
            'count' => $count,
            'excluded' => self::intArray($excludedUserIds),
        ];

        $connection->executeStatement(
            'UPDATE notification n SET count = n.count + :count, updated_at = :now
             WHERE ' . $bundle . ' AND n.user_id IN (' . self::followers() . ')',
            $params,
        );

        $connection->executeStatement(
            'INSERT INTO notification (user_id, course_id, type, exam_id, count, created_at, updated_at)
             SELECT f.user_id, :course, :type, :exam, :count, :now, :now
             FROM (' . self::followers() . ') f(user_id)
             WHERE NOT EXISTS (SELECT 1 FROM notification n WHERE n.user_id = f.user_id AND ' . $bundle . ')',
            $params,
        );
    }

    /** @param int[] $excludedUserIds */
    private function insert(
        Course $course,
        NotificationType $type,
        array $excludedUserIds,
        ?Document $document = null,
        ?Exam $exam = null,
        ?CourseComment $comment = null,
    ): void {
        $now = self::format(new DateTimeImmutable());

        $this->connection()->executeStatement(
            'INSERT INTO notification
                 (user_id, course_id, type, document_id, exam_id, course_comment_id, count, created_at, updated_at)
             SELECT f.user_id, :course, :type, :document, :exam, :comment, 1, :now, :now
             FROM (' . self::followers() . ') f(user_id)',
            [
                'course' => $course->getId(),
                'type' => $type->value,
                'document' => $document?->getId(),
                'exam' => $exam?->getId(),
                'comment' => $comment?->getId(),
                'now' => $now,
                'excluded' => self::intArray($excludedUserIds),
            ],
        );
    }

    /**
     * The ids of the users who follow :course, minus :excluded. Expects those two parameters.
     */
    private static function followers(): string
    {
        return 'SELECT fav.user_id FROM favorite_user_course fav
                WHERE fav.course_id = :course
                  AND NOT (fav.user_id = ANY (CAST(:excluded AS int[])))
                  AND NOT EXISTS (
                      SELECT 1 FROM notification_muted_course m
                      WHERE m.user_id = fav.user_id AND m.course_id = fav.course_id
                  )';
    }

    /** @param int[] $ids as a Postgres array literal, e.g. "{3,7}" */
    private static function intArray(array $ids): string
    {
        return '{' . implode(',', array_map('intval', $ids)) . '}';
    }

    private static function format(DateTimeImmutable $moment): string
    {
        return $moment->format('Y-m-d H:i:s');
    }

    private function connection(): Connection
    {
        return $this->entityManager->getConnection();
    }
}
