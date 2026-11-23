<?php

namespace App\Tests\Service\StudyPlanner;

use App\Service\StudyPlanner\IcsParser;
use PHPUnit\Framework\Attributes\DataProvider;
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

    #[DataProvider('descriptionCodeProvider')]
    public function testDetectsNumericCodesInDescription(string $description, string $expected): void
    {
        $this->assertSame(
            $expected,
            $this->parseEventType('H0T34a Nuclear Energy: Basic Aspects', $description),
        );
    }

    /**
     * @return iterable<string, array{0: string, 1: string}>
     */
    public static function descriptionCodeProvider(): iterable
    {
        yield '01 College' => ["01 College\nExtra", 'college'];
        yield '02 Practicum' => ["02 Practicum\nExtra", 'practicum'];
        yield '03 Opdracht' => ["03 Opdracht\nExtra", 'opdracht'];
        yield '07 Excursie' => ["07 Excursie\nExtra", 'excursie'];
        yield '15 Oefenzitting' => ["15 Oefenzitting\nExtra", 'oefenzitting'];
        yield 'standalone code' => ['01', 'college'];
        yield 'code on later line' => ["Group A\n15 Oefenzitting", 'oefenzitting'];
        yield 'clock time is not a code' => ['15:00 - 17:00', 'other'];
        yield 'longer digits are not a code' => ['012 Something', 'other'];
    }

    #[DataProvider('summaryCodeProvider')]
    public function testDetectsNumericCodesInSummary(string $summary, ?string $description, string $expected): void
    {
        $this->assertSame($expected, $this->parseEventType($summary, $description));
    }

    /**
     * @return iterable<string, array{0: string, 1: ?string, 2: string}>
     */
    public static function summaryCodeProvider(): iterable
    {
        yield '01 College with lecturer and info' => [
            'X0A11a Foo Bar, Anne Example, 01 College, info: bring slides',
            "X0A11a\nID 12345",
            'college',
        ];
        yield '02 Practicum without lecturer or info' => [
            'X0A11a Foo Bar, 02 Practicum',
            "Group A\nID 12345",
            'practicum',
        ];
        yield '15 Oefenzitting with subtitle and info' => [
            'H04A9a Power System Calculations: Part 1, Dirk Van Hertem, 15 Oefenzitting, info: room A',
            "H04A9a\nID 12345",
            'oefenzitting',
        ];
        yield '07 Excursie' => [
            'X0A11a Foo Bar, Anne Example, 07 Excursie, info: departure 08:00',
            "X0A11a\nID 12345",
            'excursie',
        ];
        yield '03 Opdracht' => [
            'X0A11a Foo Bar, 03 Opdracht',
            null,
            'opdracht',
        ];
    }

    public function testPrefersNumericCodeOverSubtitleAndKeywords(): void
    {
        $this->assertSame(
            'excursie',
            $this->parseEventType(
                'X0A11a Foo Bar: Exercises and Labs, Anne Example, 07 Excursie',
                "X0A11a\nID 12345",
            ),
        );
        $this->assertSame(
            'practicum',
            $this->parseEventType(
                'H04A9a Power System Calculations: Lecture, Dirk Van Hertem',
                '02 Practicum',
            ),
        );
    }

    #[DataProvider('fallbackProvider')]
    public function testDetectsKeywordFallbackAndUnrelatedOthers(
        string $summary,
        ?string $description,
        string $expected,
    ): void {
        $this->assertSame($expected, $this->parseEventType($summary, $description));
    }

    /**
     * @return iterable<string, array{0: string, 1: ?string, 2: string}>
     */
    public static function fallbackProvider(): iterable
    {
        yield 'summary : Lecture' => [
            'H04A9a Power System Calculations: Lecture, Dirk Van Hertem',
            null,
            'college',
        ];
        yield 'summary : Hoorcollege' => [
            'H04A9a Power System Calculations: Hoorcollege, Dirk Van Hertem',
            '',
            'college',
        ];
        yield 'summary : Exercises' => [
            'H04A9a Power System Calculations: Exercises, Dirk Van Hertem',
            null,
            'oefenzitting',
        ];
        yield 'summary : oefeningen' => [
            'H04A9a Power System Calculations: oefeningen, Dirk Van Hertem',
            null,
            'oefenzitting',
        ];
        yield 'summary : Practicum' => [
            'H04B0a Power System Calculations: Practicum',
            null,
            'practicum',
        ];
        yield 'summary : Exercises and Practica' => [
            'H04B0a Power System Calculations: Exercises and Practica',
            null,
            'practicum',
        ];
        yield 'multi-activity summary' => [
            'H00T2a Eindige elementen: oefeningen, '
            . 'H04C0a Finite Elements: Exercises, Ruth Vazquez Sabariego',
            null,
            'oefenzitting',
        ];
        yield 'plain description Hoorcollege' => [
            'H0T34a Nuclear Energy: Basic Aspects',
            'Hoorcollege',
            'college',
        ];
        yield 'plain description Werkcollege beats college' => [
            'H0T34a Nuclear Energy: Basic Aspects',
            'Werkcollege',
            'oefenzitting',
        ];
        yield 'plain description Practicum' => [
            'H0T34a Nuclear Energy: Basic Aspects',
            'Practicum',
            'practicum',
        ];
        yield 'plain description Labo' => [
            'H0T34a Nuclear Energy: Basic Aspects',
            "Labo's",
            'practicum',
        ];
        yield 'plain description Excursie' => [
            'H0T34a Nuclear Energy: Basic Aspects',
            'Excursie',
            'excursie',
        ];
        yield 'plain description Opdracht' => [
            'H0T34a Nuclear Energy: Basic Aspects',
            'Opdracht',
            'opdracht',
        ];
        yield 'unrelated subtitle stays other' => [
            "H0T34a Nuclear Energy: Basic Aspects, William D'haeseleer",
            null,
            'other',
        ];
        yield 'unrelated title without colon stays other' => [
            'Something else',
            "Group A\nID 12345",
            'other',
        ];
    }

    /** @return iterable<string, array{string, string, ?string}> */
    public static function summariesWithACommaInTheCourse(): iterable
    {
        yield 'course name with a comma' => [
            'H01A0a Analyse, deel 1: hoorcollege, Lutgarde Beernaert, 1Bbi: Groep A',
            'H01A0a Analyse, deel 1: hoorcollege',
            'Lutgarde Beernaert, 1Bbi: Groep A',
        ];
        yield 'no teaching staff' => [
            'H01A1a Analyse, deel 1: oefeningen',
            'H01A1a Analyse, deel 1: oefeningen',
            null,
        ];
        yield 'another activity with a comma among the people' => [
            'H01A0a Analyse, deel 1: hoorcollege, H01A4a Toegepaste algebra: hoorcollege, H01X1a Wiskunde, deel 2: oefeningen, geen docent',
            'H01A0a Analyse, deel 1: hoorcollege',
            'H01A4a Toegepaste algebra: hoorcollege, H01X1a Wiskunde, deel 2: oefeningen, geen docent',
        ];
        yield 'a course with its kind of session stays apart from a group' => [
            'H01A5a Toegepaste algebra: oefeningen, geen docent, 1Bbi: Reeks B1',
            'H01A5a Toegepaste algebra: oefeningen',
            'geen docent, 1Bbi: Reeks B1',
        ];
        yield 'a name without a kind of session keeps the old split' => [
            'H01C4a Wijsbegeerte, Stefan Rummens, 2Bbi: groep A en B',
            'H01C4a Wijsbegeerte',
            'Stefan Rummens, 2Bbi: groep A en B',
        ];
    }

    #[DataProvider('summariesWithACommaInTheCourse')]
    public function testKeepsACommaInsideTheCourseName(string $summary, string $course, ?string $people): void
    {
        $ics = implode(
            "\r\n",
            [
            'BEGIN:VCALENDAR',
            'BEGIN:VEVENT',
            'UID:comma@timeedit.com',
            'DTSTART:20261026T083500Z',
            'SUMMARY:' . str_replace(',', '\\,', $summary),
            'END:VEVENT',
            'END:VCALENDAR',
            ]
        );

        $events = (new IcsParser())->parse($ics);

        $this->assertSame($course, $events[0]['course']);
        $this->assertSame($people, $events[0]['people']);
    }

    private function parseEventType(string $summary, ?string $description = null): string
    {
        $lines = [
            'BEGIN:VCALENDAR',
            'BEGIN:VEVENT',
            'UID:type-test@timeedit.com',
            'DTSTART:20261026T083500Z',
            'SUMMARY:' . str_replace(',', '\\,', $summary),
        ];
        if (null !== $description) {
            $lines[] = 'DESCRIPTION:' . str_replace("\n", '\\n', $description);
        }
        $lines[] = 'END:VEVENT';
        $lines[] = 'END:VCALENDAR';

        $events = (new IcsParser())->parse(implode("\r\n", $lines));
        $this->assertCount(1, $events);

        return $events[0]['type'];
    }
}
