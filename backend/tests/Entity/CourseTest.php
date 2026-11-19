<?php

namespace App\Tests\Entity;

use App\Entity\Course;
use PHPUnit\Framework\TestCase;

/**
 * A course is shown in its own language of instruction, as the onderwijsaanbod lists it, whatever
 * the language of its programme or of the reader.
 */
class CourseTest extends TestCase
{
    public function testCatalogNameFollowsTheCoursesOwnLanguage(): void
    {
        $english = $this->course('Gedistribueerde systemen', 'Gedistribueerde systemen', 'Distributed Systems', 'en');
        $dutch = $this->course(
            'Business Administration',
            'Bedrijfskunde en ondernemen',
            'Business Administration',
            'nl',
        );

        $this->assertSame('Distributed Systems', $english->getCatalogName());
        $this->assertSame('Bedrijfskunde en ondernemen', $dutch->getCatalogName());
    }

    /**
     * Courses imported before name_nl/name_en existed have neither, and the migration deliberately
     * does not guess. They must keep rendering the name we already showed.
     */
    public function testCatalogNameFallsBackToNameWhenTheTitleIsMissing(): void
    {
        $course = $this->course('Gedistribueerde systemen', 'Gedistribueerde systemen', null, 'en');

        $this->assertSame('Gedistribueerde systemen', $course->getCatalogName());
    }

    public function testCatalogNameIgnoresAnEmptyTitle(): void
    {
        $course = $this->course('Distributed Systems', '', '', 'nl');

        $this->assertSame('Distributed Systems', $course->getCatalogName());
    }

    private function course(string $name, ?string $nameNl, ?string $nameEn, string $language): Course
    {
        $course = new Course();
        $course->setName($name);
        $course->setNameNl($nameNl);
        $course->setNameEn($nameEn);
        $course->setLanguage($language);

        return $course;
    }
}
