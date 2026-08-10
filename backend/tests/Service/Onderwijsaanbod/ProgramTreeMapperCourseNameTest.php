<?php

namespace App\Tests\Service\Onderwijsaanbod;

use App\Service\Onderwijsaanbod\Dto\CourseData;
use App\Service\Onderwijsaanbod\ProgramTreeMapper;
use PHPUnit\Framework\TestCase;

/**
 * KU Leuven publishes a Dutch and an English title for essentially every course and they normally
 * differ. Both must travel with the course whatever the import language, because a course shared by
 * a Dutch and an English programme used to have its single name decided by whichever import ran last.
 */
class ProgramTreeMapperCourseNameTest extends TestCase
{
    private ProgramTreeMapper $mapper;

    protected function setUp(): void
    {
        $this->mapper = new ProgramTreeMapper();
    }

    public function testBothTitlesAreCarriedWhenImportingInDutch(): void
    {
        $course = $this->firstCourse($this->source(nl: 'Gedistribueerde systemen', en: 'Distributed Systems'), 'nl');

        self::assertSame('Gedistribueerde systemen', $course->name, 'name follows the import language');
        self::assertSame('Gedistribueerde systemen', $course->nameNl);
        self::assertSame('Distributed Systems', $course->nameEn);
    }

    public function testBothTitlesAreCarriedWhenImportingInEnglish(): void
    {
        $course = $this->firstCourse($this->source(nl: 'Gedistribueerde systemen', en: 'Distributed Systems'), 'en');

        self::assertSame('Distributed Systems', $course->name);
        self::assertSame('Gedistribueerde systemen', $course->nameNl, 'the Dutch title travels too');
        self::assertSame('Distributed Systems', $course->nameEn);
    }

    /**
     * The per-language fields must not fall back across languages: writing the Dutch title into
     * nameEn would claim a translation exists, and Course::getLocalizedName() could no longer tell
     * that it should fall back to $name instead.
     */
    public function testAMissingTranslationStaysNullRatherThanBorrowingTheOtherLanguage(): void
    {
        $course = $this->firstCourse($this->source(nl: 'Alleen Nederlands', en: null), 'en');

        self::assertSame('Alleen Nederlands', $course->name, 'name still falls back so it is never empty');
        self::assertSame('Alleen Nederlands', $course->nameNl);
        self::assertNull($course->nameEn);
    }

    /**
     * @param array<string, mixed> $source
     */
    private function firstCourse(array $source, string $language): CourseData
    {
        $program = $this->mapper->map($source, '999', $language);
        self::assertNotNull($program);
        self::assertNotSame([], $program->modules);

        $courses = $program->modules[0]->courses;
        self::assertNotSame([], $courses, 'fixture should expose one course on the root module');

        return $courses[0];
    }

    /**
     * @return array<string, mixed>
     */
    private function source(string $nl, ?string $en): array
    {
        $titles = [
            ['moduleLangu' => 'NL', 'moduleTitleSet' => [['description' => $nl]]],
        ];
        if ($en !== null) {
            $titles[] = ['moduleLangu' => 'EN', 'moduleTitleSet' => [['description' => $en]]];
        }

        return ['programSet' => [[
            'programId' => '999',
            'programLanguageSet' => [
                ['programLangu' => 'NL', 'programTitleSet' => [['description' => 'Testopleiding']]],
                ['programLangu' => 'EN', 'programTitleSet' => [['description' => 'Test programme']]],
            ],
            'moduleGroupSet' => [[
                'moduleGroupId' => 'g1',
                'parentType' => 'programme',
                'parentId' => '999',
                'moduleGroupType' => '02',
                'moduleGroupLanguageSet' => [
                    ['moduleGroupLangu' => 'NL', 'moduleGroupTitleSet' => [['description' => 'Groep']]],
                    ['moduleGroupLangu' => 'EN', 'moduleGroupTitleSet' => [['description' => 'Group']]],
                ],
                'moduleSet' => [[
                    'moduleId' => 'm1',
                    'short' => 'H0N08A',
                    'originalLangu' => 'EN',
                    'stageStart' => '1',
                    'credits' => '6',
                    'mandatory' => 'True',
                    'moduleLanguageSet' => $titles,
                ]],
            ]],
        ]]];
    }
}
