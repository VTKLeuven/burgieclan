<?php

namespace App\Tests\Entity;

use App\Entity\Course;
use PHPUnit\Framework\TestCase;

class CourseTest extends TestCase
{
    public function testLocalizedNamePicksTheReadersLanguage(): void
    {
        $course = $this->course('Distributed Systems', 'Gedistribueerde systemen', 'Distributed Systems');

        $this->assertSame('Gedistribueerde systemen', $course->getLocalizedName('nl'));
        $this->assertSame('Distributed Systems', $course->getLocalizedName('en'));
    }

    /**
     * Courses imported before name_nl/name_en existed have neither, and the migration deliberately
     * does not guess. They must keep rendering the name we already showed.
     */
    public function testLocalizedNameFallsBackToNameWhenTheTranslationIsMissing(): void
    {
        $course = $this->course('Gedistribueerde systemen', null, null);

        $this->assertSame('Gedistribueerde systemen', $course->getLocalizedName('nl'));
        $this->assertSame('Gedistribueerde systemen', $course->getLocalizedName('en'));
    }

    public function testLocalizedNameFallsBackPerLanguage(): void
    {
        $course = $this->course('Alleen Nederlands', 'Alleen Nederlands', null);

        $this->assertSame('Alleen Nederlands', $course->getLocalizedName('nl'));
        $this->assertSame('Alleen Nederlands', $course->getLocalizedName('en'), 'no English title stored');
    }

    public function testLocalizedNameTreatsAnUnknownOrMissingLocaleAsDutch(): void
    {
        $course = $this->course('Distributed Systems', 'Gedistribueerde systemen', 'Distributed Systems');

        $this->assertSame('Gedistribueerde systemen', $course->getLocalizedName(null));
        $this->assertSame('Gedistribueerde systemen', $course->getLocalizedName('fr'));
    }

    public function testLocalizedNameIgnoresAnEmptyTranslation(): void
    {
        $course = $this->course('Distributed Systems', '', '');

        $this->assertSame('Distributed Systems', $course->getLocalizedName('nl'));
        $this->assertSame('Distributed Systems', $course->getLocalizedName('en'));
    }

    private function course(string $name, ?string $nameNl, ?string $nameEn): Course
    {
        $course = new Course();
        $course->setName($name);
        $course->setNameNl($nameNl);
        $course->setNameEn($nameEn);

        return $course;
    }
}
