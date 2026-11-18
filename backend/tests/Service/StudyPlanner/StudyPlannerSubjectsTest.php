<?php

namespace App\Tests\Service\StudyPlanner;

use App\Entity\StudyPlanner;
use App\Entity\StudyPlannerEvent;
use App\Entity\User;
use App\Service\StudyPlanner\StudyPlannerSubjects;
use DateTimeImmutable;
use PHPUnit\Framework\TestCase;

class StudyPlannerSubjectsTest extends TestCase
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
}
