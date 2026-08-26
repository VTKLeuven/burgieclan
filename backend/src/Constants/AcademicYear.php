<?php

namespace App\Constants;

use DateTime;

/**
 * Which academic year it currently is, and the list of years a user may pick from.
 *
 * A KU Leuven academic year runs from the last Monday of September, so for most of the
 * autumn "the current year" is not the calendar year. That rule lived inside
 * {@see \App\Entity\Document::getAcademicYearChoices()} for as long as documents were the
 * only thing carrying a year; course comments and course ratings need the same answer, and
 * a second copy of a date rule is a second chance to get it subtly wrong.
 *
 * Years are formatted "2024 - 2025" everywhere, spaces included. That string is what gets
 * stored, and it sorts correctly as text, which is why ordering can be left to the database.
 */
final class AcademicYear
{
    public const DEFAULT_AMOUNT_OF_YEARS = 10;

    /**
     * The academic year we are in today, e.g. "2024 - 2025".
     */
    public static function current(): string
    {
        return self::format(self::currentStartYear());
    }

    /**
     * The calendar year the current academic year starts in.
     */
    public static function currentStartYear(): int
    {
        $year = (int) date('Y');
        $lastMondayOfSeptember = new DateTime('last monday of september ' . $year);

        if (new DateTime() <= $lastMondayOfSeptember) {
            // Before the last Monday of September we are still in the previous academic year.
            --$year;
        }

        return $year;
    }

    public static function format(int $startYear): string
    {
        return sprintf('%d - %d', $startYear, $startYear + 1);
    }

    /**
     * The $amount most recent academic years, newest first, e.g. ["2024 - 2025", ...].
     *
     * This is the window the rating summary scores "recent" over.
     *
     * @return string[]
     */
    public static function mostRecent(int $amount): array
    {
        $start = self::currentStartYear();

        return array_map(
            static fn(int $i): string => self::format($start - $i),
            range(0, max(0, $amount - 1))
        );
    }

    /**
     * Academic year choices, newest first, formatted like '2024 - 2025' => '2024 - 2025'.
     *
     * $firstYear widens the range far enough back to still include an already stored value,
     * so editing an old record does not silently drop its year out of the dropdown.
     *
     * @return array<string, string>
     */
    public static function choices(
        int $amountOfYears = self::DEFAULT_AMOUNT_OF_YEARS,
        ?string $firstYear = null
    ): array {
        $currentYear = self::currentStartYear();

        if (null !== $firstYear) {
            $amountOfYears = max($amountOfYears, $currentYear - (int) substr($firstYear, 0, 4) + 1);
        }

        $choices = [];
        for ($i = 0; $i < $amountOfYears; $i++) {
            $formatted = self::format($currentYear - $i);
            $choices[$formatted] = $formatted;
        }

        return $choices;
    }
}
