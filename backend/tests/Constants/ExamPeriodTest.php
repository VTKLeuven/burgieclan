<?php

namespace App\Tests\Constants;

use App\Constants\ExamPeriod;
use DateTimeImmutable;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

class ExamPeriodTest extends TestCase
{
    public function testAllPeriodsFallInTheSecondCalendarYear(): void
    {
        $this->assertSame('2026-02-07', ExamPeriod::JANUARY->endsOn('2025 - 2026')->format('Y-m-d'));
        $this->assertSame('2026-07-07', ExamPeriod::JUNE->endsOn('2025 - 2026')->format('Y-m-d'));
        $this->assertSame('2026-09-15', ExamPeriod::AUGUST->endsOn('2025 - 2026')->format('Y-m-d'));

        // January may be started a little before New Year.
        $this->assertSame('2025-12-15', ExamPeriod::JANUARY->startsOn('2025 - 2026')->format('Y-m-d'));
        $this->assertSame('2026-05-20', ExamPeriod::JUNE->startsOn('2025 - 2026')->format('Y-m-d'));
        $this->assertSame('2026-08-10', ExamPeriod::AUGUST->startsOn('2025 - 2026')->format('Y-m-d'));
    }

    public function testHasStarted(): void
    {
        $march = new DateTimeImmutable('2026-03-01');

        $this->assertTrue(ExamPeriod::JANUARY->hasStarted('2025 - 2026', $march));
        $this->assertFalse(ExamPeriod::JUNE->hasStarted('2025 - 2026', $march));
        $this->assertFalse(ExamPeriod::AUGUST->hasStarted('2025 - 2026', $march));
        $this->assertTrue(ExamPeriod::AUGUST->hasStarted('2024 - 2025', $march));
        $this->assertFalse(ExamPeriod::JANUARY->hasStarted('2026 - 2027', $march));
    }

    public function testChronologicalOrder(): void
    {
        $this->assertSame([ExamPeriod::JANUARY, ExamPeriod::JUNE, ExamPeriod::AUGUST], ExamPeriod::chronological());
    }

    public function testRejectsMalformedAcademicYears(): void
    {
        foreach (['2025-2026', '2025 - 2027', '25 - 26', ''] as $year) {
            try {
                ExamPeriod::JUNE->endsOn($year);
                $this->fail(sprintf('"%s" should have been rejected', $year));
            } catch (InvalidArgumentException) {
                $this->addToAssertionCount(1);
            }
        }
    }
}
