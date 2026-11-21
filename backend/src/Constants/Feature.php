<?php

namespace App\Constants;

/**
 * A part of the site that admins switch on and off in the admin (Settings › Features), for work
 * that is not ready yet or only needed part of the year.
 *
 * A feature without a stored row is off: adding a case here never switches anything on by itself.
 * The frontend reads the switches from GET /api/features, keyed by these values.
 */
enum Feature: string
{
    /** Exam reconstructions: the section on course pages, the exam pages, and their questions in search. */
    case EXAM_RECONSTRUCTIONS = 'exam_reconstructions';

    /** Exchanges: the destinations and reports of students who studied abroad, and the short options. */
    case EXCHANGE = 'exchange';

    public function label(): string
    {
        return match ($this) {
            self::EXAM_RECONSTRUCTIONS => 'Exam reconstructions',
            self::EXCHANGE => 'Exchanges',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::EXAM_RECONSTRUCTIONS => 'Students reconstruct exams together after taking them. '
                . 'Off hides the section on course pages, the exam pages, the home page prompt and exam '
                . 'questions in search, and the API refuses exam requests. Moderators keep access in the admin.',
            self::EXCHANGE => 'The Uitwisselingen pages: exchange destinations with the reports of students who went '
                . 'there, and the shorter options abroad. Off hides the sidebar item and the pages, and the API '
                . 'refuses exchange requests. Moderators keep reviewing reports in the admin.',
        };
    }
}
