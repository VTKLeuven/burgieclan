<?php

namespace App\Tests\Service\Onderwijsaanbod;

use App\Service\Onderwijsaanbod\Dto\ModuleData;
use App\Service\Onderwijsaanbod\Dto\ProgramData;
use App\Service\Onderwijsaanbod\ProgramTreeMapper;
use PHPUnit\Framework\TestCase;

/**
 * Covers $semesterFlatKeys: dissolving top-level groups into one shared set of "Semester N"
 * folders, with elective options surviving as a folder per semester they teach in.
 *
 * The fixture models Master of Materials Engineering (programId 52927450):
 *   cc  compulsory block with two sub-groups     -> must pool with fu into the same semesters
 *   fu  a second compulsory block, incl. a jaarvak
 *   op  the "Options" wrapper holding three type-01 options:
 *        op1 teaches in semesters 1 and 2, and has a nested sub-group of its own
 *        op2 teaches only in semester 3
 *        op3 has no courses at all
 *   vr  a group that is NOT selected and must survive untouched
 */
class ProgramTreeMapperFlatSemesterTest extends TestCase
{
    /** @var list<string> */
    private const SELECTED = ['Verplichte vakken', 'Fundamenten', 'Opties'];

    private ProgramTreeMapper $mapper;

    /** @var array<string, mixed> */
    private array $source;

    protected function setUp(): void
    {
        $this->mapper = new ProgramTreeMapper();
        $json = file_get_contents(__DIR__ . '/fixtures/program_flat_semester.json');
        self::assertIsString($json);
        $this->source = json_decode($json, true);
    }

    public function testSelectedGroupsAreReplacedBySharedSemesterFolders(): void
    {
        $program = $this->map(self::SELECTED);

        self::assertSame(
            ['Semester 1', 'Semester 2', 'Semester 3', 'Vrije keuze'],
            array_map(static fn (ModuleData $m): string => $m->name, $program->modules),
            'the three selected groups are gone, the unselected one survives after the semesters',
        );
    }

    /**
     * The point of the feature: two separate compulsory blocks must land in ONE "Semester 1",
     * not produce a competing set of semester folders each.
     */
    public function testCompulsoryCoursesFromDifferentGroupsArePooled(): void
    {
        $program = $this->map(self::SELECTED);

        // C0001A from "Groep een" (under cc), C0004A + jaarvak C0005A from "Basis" (under fu).
        self::assertSame(['C0001A', 'C0004A', 'C0005A'], $this->codesOf($this->root($program, 'Semester 1')));
        self::assertSame(['C0002A', 'C0005A'], $this->codesOf($this->root($program, 'Semester 2')));
        self::assertSame(['C0003A'], $this->codesOf($this->root($program, 'Semester 3')));
    }

    public function testElectiveOptionsBecomeOneFolderPerSemesterTheyTeachIn(): void
    {
        $program = $this->map(self::SELECTED);

        $first = $this->root($program, 'Semester 1');
        self::assertSame(['Optie alfa'], $this->namesOf($first->children));
        // O0003A sits in a sub-group of the option, so it joins the option's own folder.
        self::assertSame(['O0001A', 'O0003A'], $this->codesOf($first->children[0]));
        self::assertTrue($first->children[0]->isElective, 'the folder keeps the keuze flag for the badge');

        self::assertSame(['Optie alfa'], $this->namesOf($this->root($program, 'Semester 2')->children));
        self::assertSame(['Optie beta'], $this->namesOf($this->root($program, 'Semester 3')->children));
    }

    public function testAnOptionTeachingNothingInASemesterGetsNoFolderThere(): void
    {
        $program = $this->map(self::SELECTED);

        self::assertNotContains('Optie beta', $this->namesOf($this->root($program, 'Semester 1')->children));
        self::assertNotContains('Optie beta', $this->namesOf($this->root($program, 'Semester 2')->children));
    }

    public function testAnOptionWithNoCoursesAtAllNeverAppears(): void
    {
        $program = $this->map(self::SELECTED);

        foreach ($program->modules as $module) {
            self::assertNotContains('Optie gamma', $this->namesOf($module->children));
        }
    }

    /**
     * "sometimes there will be only one course in the option map but that doesnt matter" — and the
     * enclosing semester must not be collapsed into it by mergeSingleChild either.
     */
    public function testASingleCourseOptionStillGetsItsOwnFolder(): void
    {
        $third = $this->root($this->map(self::SELECTED), 'Semester 3');

        self::assertSame('Semester 3', $third->name, 'merge must not replace the semester with its lone option');
        self::assertSame(['Optie beta'], $this->namesOf($third->children));
        self::assertSame(['O0004A'], $this->codesOf($third->children[0]));
    }

    public function testUnselectedGroupsAreLeftAlone(): void
    {
        $free = $this->root($this->map(self::SELECTED), 'Vrije keuze');

        self::assertSame(['V0001A'], $this->codesOf($free));
        self::assertSame([], $free->children);
    }

    public function testOptionFoldersUseTheImportLanguage(): void
    {
        $program = $this->map(['Compulsory Courses', 'Fundamentals', 'Options'], language: 'en');

        self::assertSame(['Option Alpha'], $this->namesOf($this->root($program, 'Semester 1')->children));
    }

    public function testWithoutKeysTheTreeIsUntouched(): void
    {
        $program = $this->map([]);

        // "Fundamenten" reads as "Basis" here: it holds a single child and no courses of its own,
        // so mergeSingleChild collapses it. Unrelated to this transform, which runs before merge.
        self::assertSame(
            ['Verplichte vakken', 'Basis', 'Opties', 'Vrije keuze'],
            array_map(static fn (ModuleData $m): string => $m->name, $program->modules),
        );
    }

    /**
     * A group named in the option but absent from the programme must not blow up or empty the tree.
     */
    public function testUnknownKeysAreIgnored(): void
    {
        $program = $this->map(['Bestaat niet']);

        // "Fundamenten" reads as "Basis" here: it holds a single child and no courses of its own,
        // so mergeSingleChild collapses it. Unrelated to this transform, which runs before merge.
        self::assertSame(
            ['Verplichte vakken', 'Basis', 'Opties', 'Vrije keuze'],
            array_map(static fn (ModuleData $m): string => $m->name, $program->modules),
        );
    }

    /**
     * @param list<string> $semesterFlat
     */
    private function map(array $semesterFlat, string $language = 'nl'): ProgramData
    {
        $program = $this->mapper->map(
            $this->source,
            '777',
            $language,
            [],
            [],
            true,
            ProgramTreeMapper::ELECTIVES_PER_TRACK,
            $semesterFlat,
        );
        self::assertNotNull($program);

        return $program;
    }

    private function root(ProgramData $program, string $name): ModuleData
    {
        foreach ($program->modules as $module) {
            if ($module->name === $name) {
                return $module;
            }
        }
        self::fail(sprintf('Root module "%s" not found', $name));
    }

    /**
     * @param list<ModuleData> $modules
     *
     * @return list<string>
     */
    private function namesOf(array $modules): array
    {
        return array_map(static fn (ModuleData $m): string => $m->name, $modules);
    }

    /**
     * @return list<string>
     */
    private function codesOf(ModuleData $module): array
    {
        $codes = array_map(static fn ($c): string => $c->code, $module->courses);
        sort($codes);

        return $codes;
    }
}
