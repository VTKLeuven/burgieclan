<?php

namespace App\Constants;

/**
 * The parts of an ATHENS review, in the order they are shown. Each one is optional; the
 * frontend translates the code.
 */
enum AthensTopic: string
{
    /** The course itself: what it covered, the level, the teachers. */
    case COURSE = 'course';
    /** How it was evaluated, and how hard that was. */
    case EXAM = 'exam';
    /** The city and the European Dimension activities. */
    case CITY = 'city';
    /** Housing, costs and the journey. */
    case PRACTICAL = 'practical';

    public function label(): string
    {
        return match ($this) {
            self::COURSE => 'Het vak',
            self::EXAM => 'Evaluatie',
            self::CITY => 'Stad en activiteiten',
            self::PRACTICAL => 'Praktisch',
        };
    }
}
