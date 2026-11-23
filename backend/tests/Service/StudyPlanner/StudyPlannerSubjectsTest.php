<?php

namespace App\Tests\Service\StudyPlanner;

use App\Entity\StudyPlanner;
use App\Entity\StudyPlannerEvent;
use App\Entity\User;
use App\Service\StudyPlanner\IcsParser;
use App\Service\StudyPlanner\StudyPlannerSubjects;
use DateTimeImmutable;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

class StudyPlannerSubjectsTest extends KernelTestCase
{
    private static function event(?string $code, string $course): StudyPlannerEvent
    {
        $event = new StudyPlannerEvent(new StudyPlanner(new User(), 'https://x'), 'uid', new DateTimeImmutable());

        return $event->update(new DateTimeImmutable(), null, $code, $course, null, null, 'college');
    }

    public function testCutsOffOnlyTheKindOfSession(): void
    {
        $cases = [
            ['H04S7a', 'H04S7a Combustion Engines: Lectures', 'Combustion Engines'],
            ['H04A1a', 'H04A1a Power Systems: Exercises and Laboratory Sessions', 'Power Systems'],
            ['H00Q1a', 'H00Q1a Vermogenelektronica: oefeningen en practica', 'Vermogenelektronica'],
            ['H00P3a', 'H00P3a Smart Distribution Systems: Theory', 'Smart Distribution Systems'],
            ['H0T34a', 'H0T34a Nuclear Energy: Basic Aspects', 'Nuclear Energy: Basic Aspects'],
            ['H04A6a', 'H04A6a Electrical Drives; Advanced Topics in Electrical Machines', 'Electrical Drives; Advanced Topics in Electrical Machines'],
            [null, 'Something else', 'Something else'],
        ];
        foreach ($cases as [$code, $course, $base]) {
            $this->assertSame($base, StudyPlannerSubjects::baseName(self::event($code, $course)), $course);
        }
    }

    /**
     * Subject labels by UID, for sessions given as [uid, summary].
     *
     * @param list<array{0: string, 1: string}> $sessions
     *
     * @return array<string, string>
     */
    private function labels(array $sessions): array
    {
        $ics = "BEGIN:VCALENDAR\r\n";
        foreach ($sessions as $i => [$uid, $summary]) {
            $ics .= sprintf("BEGIN:VEVENT\r\nUID:%s\r\nDTSTART:202610%02dT080000Z\r\nSUMMARY:%s\r\nEND:VEVENT\r\n", $uid, $i + 1, $summary);
        }
        $ics .= "END:VCALENDAR\r\n";

        $planner = new StudyPlanner(new User(), 'https://x');
        $events = [];
        foreach ((new IcsParser())->parse($ics) as $s) {
            $events[] = (new StudyPlannerEvent($planner, $s['uid'], new DateTimeImmutable()))
                ->update($s['start'], $s['end'], $s['courseCode'], $s['course'], $s['people'], $s['location'], $s['type']);
        }

        self::bootKernel();
        $resolved = static::getContainer()->get(StudyPlannerSubjects::class)->resolve($events);
        $labels = array_column($resolved['subjects'], 'label', 'key');

        return array_map(static fn (string $key): string => $labels[$key], $resolved['of']);
    }

    public function testGroupsOneCourseListedInTwoLanguages(): void
    {
        $labels = $this->labels(
            [
            ['a', 'H00T2a Eindige elementen voor elektromagnetische velden: oefeningen\, H04C0a Finite Elements for Electromagnetic Fields: Exercises\, Ruth Vazquez Sabariego'],
            ['b', 'H04C0a Finite Elements for Electromagnetic Fields: Exercises\, Ruth Vazquez Sabariego'],
            ['c', 'H04C0a Finite Elements for Electromagnetic Fields: Exercises\, Ruth Vazquez Sabariego'],
            ]
        );

        $this->assertCount(1, array_unique($labels));
    }

    /** An exam review for a whole year lists every course of that year; they stay separate courses. */
    public function testKeepsCoursesApartThatShareOneSession(): void
    {
        $labels = $this->labels(
            [
            ['analyse', 'H01A0a Analyse\, deel 1: hoorcollege\, Lutgarde Beernaert\, 1Bbi: Groep A'],
            ['algebra', 'H01A4a Toegepaste algebra: hoorcollege\, Vincent Rijmen\, 1Bbi: Groep B'],
            ['chemie', 'H01A8a Algemene en technische scheikunde: hoorcollege\, Peter Van Puyvelde\, 1Bbi: Reeks B1'],
            ['chemie-oef', 'H01A9a Algemene en technische scheikunde: oefeningen\, geen docent\, 1Bbi: Reeks A7\, A8'],
            ['inkijk', 'H01A0a Analyse\, deel 1: hoorcollege\, H01A4a Toegepaste algebra: hoorcollege\, H01A8a Algemene en technische scheikunde: hoorcollege\, H01B0a Mechanica van een enkelvoudig lichaam: hoorcollege\, geen docent\, 1Bbi: Groep A\, Exameninkijk Groep A'],
            ]
        );

        $this->assertSame('Analyse', $labels['analyse']);
        $this->assertSame('Toegepaste algebra', $labels['algebra']);
        $this->assertSame('Algemene en technische scheikunde', $labels['chemie']);
        $this->assertSame('Algemene en technische scheikunde', $labels['chemie-oef']);
        // The review goes with the course it names first; a course it only mentions gets no row.
        $this->assertSame('Analyse', $labels['inkijk']);
        $this->assertCount(3, array_unique($labels));
    }
}
