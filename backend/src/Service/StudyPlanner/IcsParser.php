<?php

namespace App\Service\StudyPlanner;

use DateTimeImmutable;
use DateTimeZone;
use Exception;

/**
 * Reads the sessions out of a KU Leuven (TimeEdit) timetable feed. RFC 5545, as far as that feed
 * uses it: unfolded lines, escaped text, and start and end times in UTC, with a time zone, or
 * floating (then Leuven time).
 *
 * A summary reads "H0T34a Nuclear Energy: Basic Aspects, William D'haeseleer": the code of the
 * teaching activity, the course, and after the first comma the teaching staff (a comma inside the
 * course name is told apart by StudyPlannerSubjects::split()). The kind of session
 * ("01 College", "02 Practicum", ...) appears at the start of the description or as a segment of
 * the summary; when absent, a ": <activity>" suffix in the summary or keyword in the description
 * serves as fallback.
 */
final class IcsParser
{
    private const TYPES = [
        '01' => 'college',
        '02' => 'practicum',
        '03' => 'opdracht',
        '07' => 'excursie',
        '15' => 'oefenzitting',
    ];

    private const CODE_PREFIX = '/^(01|02|03|07|15)(?:\s|$)/';

    /** @var array<string, string> */
    private const KEYWORD_TYPES = [
        'practicum' => '/\b(?:practicum|practica|practicals?|labo(?:[\'’]?s)?|labs?|laboratory)\b/iu',
        'oefenzitting' => '/\b(?:oefenzitting(?:en)?|oefening(?:en)?|exercises?|tutorials?'
            . '|werkcolleges?|seminars?)\b/iu',
        'college' => '/\b(?:hoorcolleges?|colleges?|lectures?|theorie|theory)\b/iu',
        'excursie' => '/\b(?:excursies?|excursions?)\b/iu',
        'opdracht' => '/\b(?:opdracht(?:en)?|assignments?)\b/iu',
    ];

    /**
     * @return list<array{uid: string, start: DateTimeImmutable, end: ?DateTimeImmutable, courseCode: ?string, course: string, people: ?string, location: ?string, type: string}>
     */
    public function parse(string $ics): array
    {
        $events = [];
        $event = null;
        foreach ($this->unfold($ics) as $line) {
            if ('BEGIN:VEVENT' === $line) {
                $event = [];
                continue;
            }
            if ('END:VEVENT' === $line) {
                if (null !== $event) {
                    $parsed = $this->toEvent($event);
                    if (null !== $parsed) {
                        $events[] = $parsed;
                    }
                }
                $event = null;
                continue;
            }
            if (null === $event) {
                continue;
            }
            $colon = $this->valueColon($line);
            if (null === $colon) {
                continue;
            }
            $head = explode(';', substr($line, 0, $colon));
            $name = strtoupper(array_shift($head));
            $params = [];
            foreach ($head as $param) {
                [$key, $value] = array_pad(explode('=', $param, 2), 2, '');
                $params[strtoupper($key)] = trim($value, '"');
            }
            $event[$name] = ['value' => substr($line, $colon + 1), 'params' => $params];
        }

        return $events;
    }

    /**
     * @return list<string>
     */
    private function unfold(string $text): array
    {
        $lines = [];
        foreach (preg_split('/\r\n|\r|\n/', $text) ?: [] as $line) {
            if ('' !== $line && (' ' === $line[0] || "\t" === $line[0]) && [] !== $lines) {
                $lines[count($lines) - 1] .= substr($line, 1);
            } else {
                $lines[] = $line;
            }
        }

        return $lines;
    }

    /** The colon between name;params and value, skipping colons inside quoted parameter values. */
    private function valueColon(string $line): ?int
    {
        $quoted = false;
        $length = strlen($line);
        for ($i = 0; $i < $length; ++$i) {
            if ('"' === $line[$i]) {
                $quoted = !$quoted;
            } elseif (':' === $line[$i] && !$quoted) {
                return $i;
            }
        }

        return null;
    }

    private function text(string $value): string
    {
        return strtr($value, ['\\n' => "\n", '\\N' => "\n", '\\,' => ',', '\;' => ';', '\\\\' => '\\']);
    }

    /**
     * @param array<string, array{value: string, params: array<string, string>}> $event
     *
     * @return array{uid: string, start: DateTimeImmutable, end: ?DateTimeImmutable, courseCode: ?string, course: string, people: ?string, location: ?string, type: string}|null
     */
    private function toEvent(array $event): ?array
    {
        $uid = trim($this->text($event['UID']['value'] ?? ''));
        $summary = trim($this->text($event['SUMMARY']['value'] ?? ''));
        $start = isset($event['DTSTART']) ? $this->time($event['DTSTART']) : null;
        if ('' === $uid || '' === $summary || null === $start || strlen($uid) > 255) {
            return null;
        }
        $end = isset($event['DTEND']) ? $this->time($event['DTEND']) : null;
        if (null !== $end && $end <= $start) {
            $end = null;
        }

        $parts = StudyPlannerSubjects::split($summary, true);
        $course = $parts[0] ?? $summary;
        $people = implode(', ', array_slice($parts, 1));
        $code = preg_match('/^[A-Z0-9]{5,7}[a-z0-9]*/', $summary, $m) ? $m[0] : null;
        $location = trim($this->text($event['LOCATION']['value'] ?? ''));
        $description = $this->text($event['DESCRIPTION']['value'] ?? '');

        return [
            'uid' => $uid,
            'start' => $start,
            'end' => $end,
            'courseCode' => null !== $code && strlen($code) <= 32 ? $code : null,
            'course' => $course,
            'people' => '' === $people ? null : $people,
            'location' => '' === $location ? null : $location,
            'type' => $this->detectType($description, $summary),
        ];
    }

    /**
     * Detects the session type from TimeEdit's numeric prefix in DESCRIPTION or SUMMARY, falling
     * back to `: <activity>` suffixes in SUMMARY and plain keyword lines in DESCRIPTION.
     */
    private function detectType(string $description, string $summary): string
    {
        $descriptionLines = array_filter(
            array_map('trim', explode("\n", $description)),
            static fn (string $line): bool => '' !== $line,
        );
        $summaryParts = array_filter(
            array_map('trim', explode(',', $summary)),
            static fn (string $part): bool => '' !== $part,
        );

        foreach ([...$descriptionLines, ...$summaryParts] as $candidate) {
            if (1 === preg_match(self::CODE_PREFIX, $candidate, $m)) {
                return self::TYPES[$m[1]];
            }
        }

        $fallback = [];
        foreach ($summaryParts as $part) {
            $colon = strrpos($part, ': ');
            if (false !== $colon) {
                $fallback[] = substr($part, $colon + 2);
            }
        }
        foreach ($descriptionLines as $line) {
            $fallback[] = $line;
        }

        foreach ($fallback as $text) {
            foreach (self::KEYWORD_TYPES as $type => $pattern) {
                if (1 === preg_match($pattern, $text)) {
                    return $type;
                }
            }
        }

        return 'other';
    }

    /**
     * @param array{value: string, params: array<string, string>} $property
     */
    private function time(array $property): ?DateTimeImmutable
    {
        $value = trim($property['value']);
        try {
            if (preg_match('/^(\d{8})T(\d{6})Z$/', $value, $m)) {
                return $this->create($m[1] . $m[2], new DateTimeZone('UTC'));
            }
            $zone = LeuvenTime::zone();
            if (isset($property['params']['TZID'])) {
                try {
                    $zone = new DateTimeZone($property['params']['TZID']);
                } catch (Exception) {
                    // An unknown zone name: read it as Leuven time, which it almost certainly is.
                }
            }
            if (preg_match('/^(\d{8})T(\d{6})$/', $value, $m)) {
                return $this->create($m[1] . $m[2], $zone);
            }
            if (preg_match('/^(\d{8})$/', $value, $m)) {
                return $this->create($m[1] . '000000', $zone);
            }
        } catch (Exception) {
            return null;
        }

        return null;
    }

    private function create(string $digits, DateTimeZone $zone): ?DateTimeImmutable
    {
        $time = DateTimeImmutable::createFromFormat('!YmdHis', $digits, $zone);

        return false === $time ? null : $time->setTimezone(new DateTimeZone('UTC'));
    }
}
