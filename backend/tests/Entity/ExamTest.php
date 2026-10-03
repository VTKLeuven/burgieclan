<?php

namespace App\Tests\Entity;

use App\Constants\ExamPeriod;
use App\Entity\Exam;
use DateTimeImmutable;
use PHPUnit\Framework\TestCase;

class ExamTest extends TestCase
{
    public function testLocksTwoWeeksAfterItsPeriodEnds(): void
    {
        $startedDuringTheExams = new DateTimeImmutable('2026-06-15 10:00');

        $this->assertSame(
            '2026-07-21 00:00',
            Exam::defaultEditableUntil(ExamPeriod::JUNE, '2025 - 2026', $startedDuringTheExams)->format('Y-m-d H:i')
        );
    }

    public function testAnOldExamStartedLateStillGetsTwoWeeks(): void
    {
        $now = new DateTimeImmutable('2026-10-01 12:00');

        $this->assertSame(
            '2026-10-15 12:00',
            Exam::defaultEditableUntil(ExamPeriod::JANUARY, '2021 - 2022', $now)->format('Y-m-d H:i')
        );
    }

    public function testDocumentNames(): void
    {
        $this->assertSame(12, Exam::idFromDocumentName('exam-12'));
        $this->assertNull(Exam::idFromDocumentName('exam-0'));
        $this->assertNull(Exam::idFromDocumentName('exam-012'));
        $this->assertNull(Exam::idFromDocumentName('exam-'));
        $this->assertNull(Exam::idFromDocumentName('collab-test'));
        $this->assertNull(Exam::idFromDocumentName('exam-12-copy'));
    }
}
