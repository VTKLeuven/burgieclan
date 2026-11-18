<?php

namespace App\Service\StudyPlanner;

use DateTimeImmutable;
use DateTimeZone;

/**
 * Wall-clock time in Leuven. The planner shows, compares and exports everything as it reads on a
 * clock there, whatever the time zone of the server or the device.
 */
final class LeuvenTime
{
    public const TIME_ZONE = 'Europe/Brussels';

    private static ?DateTimeZone $zone = null;

    public static function zone(): DateTimeZone
    {
        return self::$zone ??= new DateTimeZone(self::TIME_ZONE);
    }

    /**
     * @return array{date: string, time: string, minutes: int, weekday: int} weekday 0 = Monday
     */
    public static function wall(DateTimeImmutable $at): array
    {
        $local = $at->setTimezone(self::zone());
        $hours = (int) $local->format('G');
        $minutes = (int) $local->format('i');

        return [
            'date' => $local->format('Y-m-d'),
            'time' => $local->format('H:i'),
            'minutes' => $hours * 60 + $minutes,
            'weekday' => (int) $local->format('N') - 1,
        ];
    }

    /** The instant of a Leuven date ("2026-10-14") and time ("13:30"). */
    public static function at(string $date, string $time): DateTimeImmutable
    {
        return new DateTimeImmutable($date . ' ' . $time, self::zone());
    }

    /** The Monday of the week of $date, as "YYYY-MM-DD". */
    public static function mondayOf(string $date): string
    {
        $day = new DateTimeImmutable($date, self::zone());

        return $day->modify('-' . ((int) $day->format('N') - 1) . ' days')->format('Y-m-d');
    }

    public static function isValidDate(mixed $value): bool
    {
        if (!is_string($value) || !preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $value, $m)) {
            return false;
        }

        return checkdate((int) $m[2], (int) $m[3], (int) $m[1]);
    }

    public static function isValidTime(mixed $value): bool
    {
        return is_string($value) && (bool) preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $value);
    }
}
