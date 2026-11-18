<?php

namespace App\Tests\Service\StudyPlanner;

use App\Service\StudyPlanner\IcsParser;
use PHPUnit\Framework\TestCase;

class IcsParserTest extends TestCase
{
    public function testParsesTimeEditSessions(): void
    {
        $ics = implode(
            "\r\n",
            [
            'BEGIN:VCALENDAR',
            'BEGIN:VEVENT',
            'UID:5874805-1311329119-0@timeedit.com',
            'DTSTART:20261026T083500Z',
            'DTEND:20261026T103000Z',
            'SUMMARY:H0T34a Nuclear Energy: Basic Aspects\, William D\'haeseleer\, Ann',
            ' e Example',
            'LOCATION:aula E C300.00.0077\nsecond room',
            'DESCRIPTION:15 Oefenzitting\nExtra',
            'END:VEVENT',
            'BEGIN:VEVENT',
            'UID:floating@x',
            'DTSTART;TZID=Europe/Brussels:20261026T140000',
            'SUMMARY:Something else',
            'END:VEVENT',
            'BEGIN:VEVENT',
            'UID:no-start@x',
            'SUMMARY:Broken',
            'END:VEVENT',
            'END:VCALENDAR',
            ]
        );

        $events = (new IcsParser())->parse($ics);

        $this->assertCount(2, $events);
        $this->assertSame('5874805-1311329119-0@timeedit.com', $events[0]['uid']);
        $this->assertSame('H0T34a', $events[0]['courseCode']);
        $this->assertSame('H0T34a Nuclear Energy: Basic Aspects', $events[0]['course']);
        $this->assertSame("William D'haeseleer, Anne Example", $events[0]['people']);
        $this->assertSame("aula E C300.00.0077\nsecond room", $events[0]['location']);
        $this->assertSame('oefenzitting', $events[0]['type']);
        $this->assertSame('2026-10-26T08:35:00+00:00', $events[0]['start']->format(DATE_ATOM));

        // 14:00 in Leuven on 26 October (winter time) is 13:00 UTC.
        $this->assertSame('2026-10-26T13:00:00+00:00', $events[1]['start']->format(DATE_ATOM));
        $this->assertNull($events[1]['end']);
        $this->assertNull($events[1]['courseCode']);
        $this->assertSame('other', $events[1]['type']);
    }
}
