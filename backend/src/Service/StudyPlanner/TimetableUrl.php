<?php

namespace App\Service\StudyPlanner;

/**
 * Checks a timetable subscription link before Burgieclan ever fetches it. Only KU Leuven's
 * TimeEdit feeds are accepted: the server fetches the link itself, so an arbitrary address would
 * let anyone make it call any host (including ones inside our own network).
 *
 * Accepts what the KU Leuven timetable hands out, e.g.
 * webcal://cloud.timeedit.net/be_kuleuven/web/public/s.ics?sid=7&type=student&...
 * and stores it as https.
 */
final class TimetableUrl
{
    public const HOST = 'cloud.timeedit.net';
    public const MAX_LENGTH = 1000;

    /**
     * @return string|null the link as https, or null when it is not a KU Leuven TimeEdit feed
     */
    public static function normalize(string $url): ?string
    {
        $url = trim($url);
        if ('' === $url || strlen($url) > self::MAX_LENGTH || preg_match('/\s/', $url)) {
            return null;
        }
        if (preg_match('#^webcals?://#i', $url)) {
            $url = 'https://' . preg_replace('#^webcals?://#i', '', $url);
        }

        $parts = parse_url($url);
        if (false === $parts) {
            return null;
        }
        $scheme = strtolower($parts['scheme'] ?? '');
        $host = strtolower($parts['host'] ?? '');
        $path = $parts['path'] ?? '';
        if (
            !in_array($scheme, ['https', 'http'], true)
            || self::HOST !== $host
            || isset($parts['port'])
            || isset($parts['user'])
            || isset($parts['pass'])
            || !str_starts_with($path, '/be_kuleuven/')
            || !str_ends_with($path, '.ics')
        ) {
            return null;
        }

        return 'https://' . self::HOST . $path . (isset($parts['query']) ? '?' . $parts['query'] : '');
    }
}
