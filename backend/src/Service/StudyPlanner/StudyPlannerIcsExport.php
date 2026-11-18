<?php

namespace App\Service\StudyPlanner;

use App\Entity\StudyPlanner;
use App\Entity\StudyPlannerEvent;
use DateTimeImmutable;
use DateTimeZone;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * The calendar a study planner exports, for a calendar app to subscribe to instead of the KU
 * Leuven timetable (RFC 5545): the same sessions with their own titles and rooms, without the ones
 * hidden in the planner, the mandatory ones titled "MANDATORY: …", plus the deadlines (all day)
 * and the mandatory sessions entered by hand.
 */
class StudyPlannerIcsExport
{
    private const TYPE_LABELS = [
        'college' => 'Lecture',
        'practicum' => 'Practical',
        'oefenzitting' => 'Exercise session',
        'excursie' => 'Excursion',
        'opdracht' => 'Assignment',
    ];

    public function __construct(
        private readonly StudyPlannerState $state,
        #[Autowire(param: 'app.frontend_url')]
        private readonly string $frontendUrl,
    ) {}

    public function build(StudyPlanner $planner): string
    {
        $api = $this->state->build($planner);
        $host = parse_url($this->frontendUrl, PHP_URL_HOST) ?: 'burgieclan';
        $stamp = $this->utc(new DateTimeImmutable());
        $subjects = [];
        foreach ($api->subjects as $subject) {
            $subjects[$subject['key']] = $subject;
        }
        /** @var array<string, StudyPlannerEvent> $raw */
        $raw = [];
        foreach ($this->state->activeEvents($planner) as $event) {
            $raw[$event->getUid()] = $event;
        }

        $lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Burgieclan//Study planner//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'X-WR-CALNAME:' . $this->text('Timetable (Burgieclan)'),
            'X-WR-CALDESC:' . $this->text('KU Leuven timetable from Burgieclan: without the sessions hidden there, with the mandatory sessions marked and the deadlines added.'),
            'X-WR-TIMEZONE:' . LeuvenTime::TIME_ZONE,
            'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
            'X-PUBLISHED-TTL:PT1H',
        ];
        $add = static function (array $fields) use (&$lines): void {
            $lines[] = 'BEGIN:VEVENT';
            foreach ($fields as $field) {
                if (null !== $field) {
                    $lines[] = $field;
                }
            }
            $lines[] = 'END:VEVENT';
        };

        foreach ($api->events as $event) {
            $source = $raw[$event['uid']] ?? null;
            if (null !== $event['hidden'] || null === $source) {
                continue;
            }
            $mandatory = null !== $event['mandatory'];
            $title = implode(', ', array_filter([$source->getCourse(), $source->getPeople()]));
            $url = null !== $event['courseId'] ? $this->courseUrl((int) $event['courseId']) : null;
            $details = array_filter(
                [
                (self::TYPE_LABELS[$event['type']] ?? 'Session') . (null !== $event['code'] ? ' (' . $event['code'] . ')' : ''),
                $source->getPeople(),
                $mandatory ? 'Marked as mandatory on Burgieclan' : null,
                $event['done'] ? 'Ticked off on Burgieclan' : null,
                null !== $url ? "\nCourse on Burgieclan: " . $url : null,
                ]
            );
            $end = $source->getEndsAt();
            $add(
                [
                'UID:' . preg_replace('/@.*$/', '', $source->getUid()) . '@' . $host,
                'DTSTAMP:' . $stamp,
                'DTSTART:' . $this->utc($source->getStartsAt()),
                null !== $end && $end > $source->getStartsAt() ? 'DTEND:' . $this->utc($end) : null,
                'SUMMARY:' . $this->text(($mandatory ? 'MANDATORY: ' : '') . $title),
                null !== $source->getLocation() ? 'LOCATION:' . $this->text($source->getLocation()) : null,
                'DESCRIPTION:' . $this->text(implode("\n", $details)),
                null !== $url ? 'URL:' . $url : null,
                ]
            );
        }

        foreach ($api->items as $item) {
            $subject = $subjects[$item['subject']] ?? null;
            $name = $subject['label'] ?? $item['subjectLabel'];
            $deadline = 'deadline' === $item['kind'];
            $summary = $deadline
                ? sprintf('Deadline: %s (%s%s)', $item['title'], $name, null !== $item['time'] ? ', ' . $item['time'] : '')
                : sprintf('MANDATORY: %s (%s)', $item['title'], $name);
            $details = array_filter(
                [
                $name,
                $deadline ? 'Due ' . $item['date'] . (null !== $item['time'] ? ' at ' . $item['time'] : ', end of day') : null,
                '' !== $item['note'] ? "\n" . $item['note'] : null,
                null !== $item['done'] ? "\nTicked off on Burgieclan" : null,
                ]
            );
            $time = $deadline ? null : $item['time'];
            $url = null !== ($subject['courseId'] ?? null) ? $this->courseUrl((int) $subject['courseId']) : null;
            $nextDay = (new DateTimeImmutable($item['date']))->modify('+1 day')->format('Ymd');
            $add(
                [
                'UID:item-' . $item['id'] . '@' . $host,
                'DTSTAMP:' . $stamp,
                null !== $time
                    ? 'DTSTART:' . $this->utc(LeuvenTime::at($item['date'], $time))
                    : 'DTSTART;VALUE=DATE:' . str_replace('-', '', $item['date']),
                null !== $time
                    ? (null !== $item['end'] ? 'DTEND:' . $this->utc(LeuvenTime::at($item['date'], $item['end'])) : null)
                    : 'DTEND;VALUE=DATE:' . $nextDay,
                'SUMMARY:' . $this->text((null !== $item['done'] ? '✓ ' : '') . $summary),
                'DESCRIPTION:' . $this->text(implode("\n", $details)),
                null !== $url ? 'URL:' . $url : null,
                null === $time ? 'TRANSP:TRANSPARENT' : null,
                ]
            );
        }

        $lines[] = 'END:VCALENDAR';

        return implode("\r\n", array_map($this->fold(...), $lines)) . "\r\n";
    }

    private function courseUrl(int $id): string
    {
        return rtrim($this->frontendUrl, '/') . '/course/' . $id;
    }

    private function utc(DateTimeImmutable $at): string
    {
        return $at->setTimezone(new DateTimeZone('UTC'))->format('Ymd\THis\Z');
    }

    /** Escapes a TEXT value (RFC 5545, 3.3.11). */
    private function text(string $value): string
    {
        return str_replace(["\\", ';', ',', "\r\n", "\n"], ["\\\\", '\;', '\\,', '\\n', '\\n'], $value);
    }

    /** Folds a content line after 75 octets, never inside a UTF-8 character (RFC 5545, 3.1). */
    private function fold(string $line): string
    {
        $parts = [];
        $part = '';
        foreach (mb_str_split($line) as $char) {
            // Continuation lines start with a space, which counts too.
            if (strlen($part) + strlen($char) > ([] === $parts ? 75 : 74)) {
                $parts[] = $part;
                $part = '';
            }
            $part .= $char;
        }
        $parts[] = $part;

        return implode("\r\n ", $parts);
    }
}
