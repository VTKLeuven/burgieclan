<?php

namespace App\Tests\Constants;

use App\Constants\AcademicYear;
use App\Entity\Document;
use PHPUnit\Framework\TestCase;

class AcademicYearTest extends TestCase
{
    public function testCurrentYearIsFormattedWithSpaces(): void
    {
        // The stored format is load-bearing: it is what sorts, and what the regex on
        // CourseCommentApi::$academicYear accepts.
        self::assertMatchesRegularExpression('/^\d{4} - \d{4}$/', AcademicYear::current());
    }

    public function testAnAcademicYearSpansTwoConsecutiveCalendarYears(): void
    {
        [$start, $end] = explode(' - ', AcademicYear::format(2024));
        self::assertSame('2024', $start);
        self::assertSame('2025', $end);
    }

    public function testMostRecentReturnsTheWindowNewestFirst(): void
    {
        $years = AcademicYear::mostRecent(3);

        self::assertCount(3, $years);
        self::assertSame(AcademicYear::current(), $years[0]);
        $sorted = $years;
        rsort($sorted);
        self::assertSame($sorted, $years, 'The window must come back newest first.');
    }

    public function testChoicesWidenBackFarEnoughToKeepAnAlreadyStoredYear(): void
    {
        // Editing an old record must not silently drop its own year out of the dropdown.
        $choices = AcademicYear::choices(2, '2019 - 2020');

        self::assertArrayHasKey('2019 - 2020', $choices);
    }

    public function testDocumentStillDelegatesToTheSharedHelper(): void
    {
        // Document::getAcademicYearChoices() is called from the admin controllers and the
        // fixtures; extracting the rule must not have changed what they get back.
        self::assertSame(AcademicYear::choices(5), Document::getAcademicYearChoices(5));
    }
}
