<?php

namespace App\Constants;

use DateTimeImmutable;
use InvalidArgumentException;

/**
 * The three KU Leuven exam periods an exam reconstruction can belong to.
 *
 * The start and end dates are deliberately approximate constants, not the official academic
 * calendar: they only decide when a reconstruction may be started (not before its period has
 * begun) and when it locks by default (two weeks after the period ends). Moderators move the
 * lock date of a single exam when the default does not fit.
 *
 * All three periods fall in the second calendar year of the academic year, so the January exams
 * of "2025 - 2026" are those of January 2026. January may be started a little before New Year,
 * for the odd exam that comes before the Christmas break is over.
 */
enum ExamPeriod: string
{
    case JANUARY = 'january';
    case JUNE = 'june';
    /** The resits, which run from mid-August into September. */
    case AUGUST = 'august';

    /**
     * The periods in the order they happen within one academic year.
     *
     * @return list<self>
     */
    public static function chronological(): array
    {
        return [self::JANUARY, self::JUNE, self::AUGUST];
    }

    /**
     * Roughly when this period begins, e.g. 20 May 2026 for the June exams of "2025 - 2026".
     */
    public function startsOn(string $academicYear): DateTimeImmutable
    {
        $year = self::secondCalendarYear($academicYear);

        return match ($this) {
            self::JANUARY => self::date($year - 1, 12, 15),
            self::JUNE => self::date($year, 5, 20),
            self::AUGUST => self::date($year, 8, 10),
        };
    }

    /**
     * Roughly when this period is over, e.g. 7 July 2026 for the June exams of "2025 - 2026".
     */
    public function endsOn(string $academicYear): DateTimeImmutable
    {
        $year = self::secondCalendarYear($academicYear);

        return match ($this) {
            self::JANUARY => self::date($year, 2, 7),
            self::JUNE => self::date($year, 7, 7),
            self::AUGUST => self::date($year, 9, 15),
        };
    }

    public function hasStarted(string $academicYear, ?DateTimeImmutable $now = null): bool
    {
        return ($now ?? new DateTimeImmutable()) >= $this->startsOn($academicYear);
    }

    /**
     * "2025 - 2026" gives 2026. Throws on anything not in that format.
     */
    public static function secondCalendarYear(string $academicYear): int
    {
        $valid = 1 === preg_match('/^(\d{4}) - (\d{4})$/', $academicYear, $matches)
            && (int) $matches[2] === (int) $matches[1] + 1;

        if (!$valid) {
            throw new InvalidArgumentException(
                sprintf('"%s" is not an academic year like "2025 - 2026".', $academicYear)
            );
        }

        return (int) $matches[2];
    }

    private static function date(int $year, int $month, int $day): DateTimeImmutable
    {
        return (new DateTimeImmutable())->setDate($year, $month, $day)->setTime(0, 0);
    }
}
