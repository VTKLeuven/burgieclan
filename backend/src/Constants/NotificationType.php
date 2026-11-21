<?php

namespace App\Constants;

/**
 * What a notification is about. Every kind belongs to one course, and reaches the users who have
 * that course among their favourites and did not switch its notifications off.
 */
enum NotificationType: string
{
    /** A document was approved by a moderator, or uploaded straight past review. */
    case DOCUMENT = 'document';
    case COURSE_COMMENT = 'course_comment';
    /** Someone started an exam reconstruction. */
    case EXAM = 'exam';
    /** Questions were added to a reconstruction; one notification per exam per day, counted. */
    case EXAM_QUESTIONS = 'exam_questions';

    public function isAboutExams(): bool
    {
        return self::EXAM === $this || self::EXAM_QUESTIONS === $this;
    }
}
