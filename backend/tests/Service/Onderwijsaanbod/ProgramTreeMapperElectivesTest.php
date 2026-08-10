<?php

namespace App\Tests\Service\Onderwijsaanbod;

use App\Service\Onderwijsaanbod\Dto\CourseData;
use App\Service\Onderwijsaanbod\Dto\ModuleData;
use App\Service\Onderwijsaanbod\ProgramTreeMapper;
use PHPUnit\Framework\TestCase;

/**
 * Covers the elective flag (moduleGroupType "01") and the electiveGrouping transform.
 *
 * The fixture models the four shapes actually observed in the KU Leuven API:
 *   a1  afstudeerrichting with a self-named compulsory option + Keuzepakket A/B/C
 *   b1  afstudeerrichting with a single, non-lettered elective ("Administratieve optie")
 *   c1  master with two *named* keuzepakketten ("… accountancy", "… verzekeringen")
 *   d1  parent whose only children are lettered packages
 */
class ProgramTreeMapperElectivesTest extends TestCase
{
    private ProgramTreeMapper $mapper;

    /** @var array<string, mixed> */
    private array $source;

    protected function setUp(): void
    {
        $this->mapper = new ProgramTreeMapper();
        $json = file_get_contents(__DIR__ . '/fixtures/program_electives.json');
        self::assertIsString($json);
        $this->source = json_decode($json, true);
    }

    public function testElectiveFlagIsReadFromModuleGroupType(): void
    {
        $program = $this->map(electiveGrouping: ProgramTreeMapper::ELECTIVES_NONE, merge: false);

        $alfa = $this->rootByName($program->modules, 'Afstudeerrichting alfa');
        self::assertFalse($alfa->isElective, 'moduleGroupType 02 is a compulsory group');

        foreach ($alfa->children as $child) {
            self::assertTrue($child->isElective, sprintf('"%s" has moduleGroupType 01', $child->name));
        }
    }

    /**
     * The transforms rebuild ModuleData objects, so the flag has to be threaded through each of
     * them explicitly — a regression here would silently mark every module as non-elective.
     */
    public function testElectiveFlagSurvivesMergeFlattenAndSemesterize(): void
    {
        $merged = $this->map(electiveGrouping: ProgramTreeMapper::ELECTIVES_NONE, merge: true);
        self::assertTrue(
            $this->rootByName($merged->modules, 'Afstudeerrichting alfa')->isElective === false
        );
        $alfaOption = $this->childByName($this->rootByName($merged->modules, 'Afstudeerrichting alfa'), 'Keuzepakket A');
        self::assertTrue($alfaOption->isElective, 'merge must preserve isElective');

        $flattened = $this->map(electiveGrouping: ProgramTreeMapper::ELECTIVES_NONE, merge: false, flatten: ['Keuzepakket C']);
        $alfa = $this->rootByName($flattened->modules, 'Afstudeerrichting alfa');
        self::assertTrue($this->childByName($alfa, 'Keuzepakket B')->isElective, 'flatten must preserve isElective');

        $semesterized = $this->map(electiveGrouping: ProgramTreeMapper::ELECTIVES_NONE, merge: false, semester: ['Afstudeerrichting delta']);
        $delta = $this->rootByName($semesterized->modules, 'Afstudeerrichting delta');
        self::assertFalse($delta->isElective, 'semesterize must preserve the parent flag');
    }

    public function testPackagesAreGatheredIntoAFolderPerTrack(): void
    {
        $program = $this->map(electiveGrouping: ProgramTreeMapper::ELECTIVES_PER_TRACK, merge: false);
        $alfa = $this->rootByName($program->modules, 'Afstudeerrichting alfa');

        $names = array_map(static fn (ModuleData $m): string => $m->name, $alfa->children);
        self::assertSame(['Afstudeerrichting alfa', 'Keuzepakketten'], $names);

        $folder = $this->childByName($alfa, 'Keuzepakketten');
        self::assertTrue($folder->isElective);
        self::assertSame('keuzepakketten:888:a1', $folder->kulId, 'folder id is scoped to its parent');
        self::assertSame([], $folder->courses, 'the folder holds packages, not courses');

        // Each package survives as its own sub-module, keeping its own courses.
        $packageNames = array_map(static fn (ModuleData $m): string => $m->name, $folder->children);
        self::assertSame(['Keuzepakket A', 'Keuzepakket B', 'Keuzepakket C'], $packageNames);
        self::assertSame(['A0002A'], array_map(static fn (CourseData $c): string => $c->code, $folder->children[0]->courses));
    }

    public function testGroupingIsDisabledByNone(): void
    {
        $program = $this->map(electiveGrouping: ProgramTreeMapper::ELECTIVES_NONE, merge: false);
        $alfa = $this->rootByName($program->modules, 'Afstudeerrichting alfa');

        $names = array_map(static fn (ModuleData $m): string => $m->name, $alfa->children);
        self::assertSame(
            ['Afstudeerrichting alfa', 'Keuzepakket A', 'Keuzepakket B', 'Keuzepakket C'],
            $names
        );
    }

    /**
     * KU Leuven repeats a package under every track that offers it, with a different
     * moduleGroupId each time. Both grouping modes must resolve those to one shared module so the
     * importer writes a single row.
     */
    public function testIdenticalPackagesAcrossTracksBecomeOneSharedModule(): void
    {
        $program = $this->map(electiveGrouping: ProgramTreeMapper::ELECTIVES_PER_TRACK, merge: false);

        $alfaB = $this->childByName($this->childByName($this->rootByName($program->modules, 'Afstudeerrichting alfa'), 'Keuzepakketten'), 'Keuzepakket B');
        $deltaB = $this->childByName($this->childByName($this->rootByName($program->modules, 'Afstudeerrichting delta'), 'Keuzepakketten'), 'Keuzepakket B');

        self::assertSame('keuzepakket:888:keuzepakket-b', $alfaB->kulId);
        self::assertSame($alfaB->kulId, $deltaB->kulId, 'same kulId means the importer writes one row');
        self::assertSame($alfaB, $deltaB, 'and it is literally the same node');
    }

    /**
     * Same name but a different course set is not the same package: merging would invent a course
     * list that exists nowhere. Such a package keeps its own moduleGroupId instead.
     */
    public function testSameNameWithDifferentCoursesIsNotDeduplicated(): void
    {
        $program = $this->map(electiveGrouping: ProgramTreeMapper::ELECTIVES_PER_TRACK, merge: false);

        $alfaA = $this->childByName($this->childByName($this->rootByName($program->modules, 'Afstudeerrichting alfa'), 'Keuzepakketten'), 'Keuzepakket A');
        $deltaA = $this->childByName($this->childByName($this->rootByName($program->modules, 'Afstudeerrichting delta'), 'Keuzepakketten'), 'Keuzepakket A');

        self::assertNotSame($alfaA->kulId, $deltaA->kulId);
        self::assertSame('888:d3', $deltaA->kulId, 'the colliding one keeps its own (namespaced) moduleGroupId');
        self::assertSame(['A0002A'], array_map(static fn (CourseData $c): string => $c->code, $alfaA->courses));
        self::assertSame(['D0001A'], array_map(static fn (CourseData $c): string => $c->code, $deltaA->courses));
    }

    public function testProgrammeModeHoistsEverythingIntoOneFolder(): void
    {
        $program = $this->map(electiveGrouping: ProgramTreeMapper::ELECTIVES_PROGRAMME, merge: false);

        $rootNames = array_map(static fn (ModuleData $m): string => $m->name, $program->modules);
        self::assertSame('Keuzepakketten', end($rootNames), 'the folder is appended at programme level');

        $folder = $this->rootByName($program->modules, 'Keuzepakketten');
        self::assertSame('keuzepakketten:888', $folder->kulId);

        // A, B, C from alfa plus delta's colliding A — sorted, deduplicated.
        $names = array_map(static fn (ModuleData $m): string => $m->name, $folder->children);
        self::assertSame(['Keuzepakket A', 'Keuzepakket A', 'Keuzepakket B', 'Keuzepakket C'], $names);

        // The tracks no longer carry any package themselves.
        $alfa = $this->rootByName($program->modules, 'Afstudeerrichting alfa');
        self::assertSame(['Afstudeerrichting alfa'], array_map(static fn (ModuleData $m): string => $m->name, $alfa->children));
    }

    /**
     * "Keuzepakket accountancy" and "Keuzepakket verzekeringen" are distinct named packages, not
     * interchangeable lettered pools. Grouping them would destroy real structure.
     */
    public function testNamedKeuzepakkettenAreNeverGrouped(): void
    {
        foreach ([ProgramTreeMapper::ELECTIVES_PER_TRACK, ProgramTreeMapper::ELECTIVES_PROGRAMME] as $mode) {
            $program = $this->map(electiveGrouping: $mode, merge: false);
            $gamma = $this->rootByName($program->modules, 'Master gamma');

            $names = array_map(static fn (ModuleData $m): string => $m->name, $gamma->children);
            self::assertSame(['Keuzepakket accountancy', 'Keuzepakket verzekeringen'], $names, $mode);
        }
    }

    /**
     * A lone package needs no folder: wrapping one child adds a level and says nothing.
     */
    public function testSingleElectiveIsLeftAlone(): void
    {
        $program = $this->map(electiveGrouping: ProgramTreeMapper::ELECTIVES_PER_TRACK, merge: false);
        $beta = $this->rootByName($program->modules, 'Afstudeerrichting beta');

        $names = array_map(static fn (ModuleData $m): string => $m->name, $beta->children);
        self::assertSame(['Afstudeerrichting beta', 'Administratieve optie'], $names);
    }

    /**
     * The EN titles read "Elective Package A", so a Dutch-only match would group nothing when
     * importing in English.
     */
    public function testEnglishElectivePackagesAreGroupedToo(): void
    {
        $program = $this->map(electiveGrouping: ProgramTreeMapper::ELECTIVES_PER_TRACK, merge: false, language: 'en');
        $alfa = $this->rootByName($program->modules, 'Specialisation Alpha');

        $names = array_map(static fn (ModuleData $m): string => $m->name, $alfa->children);
        self::assertSame(['Specialisation Alpha', 'Elective Packages'], $names, 'folder is named in English');
    }

    /**
     * With merge on, a parent left holding only the folder must keep its own name — otherwise
     * "Afstudeerrichting delta" would be replaced by the generic "Keuzepakketten".
     */
    public function testParentKeepsItsNameWhenOnlyTheFolderRemains(): void
    {
        $program = $this->map(electiveGrouping: ProgramTreeMapper::ELECTIVES_PER_TRACK, merge: true);
        $delta = $this->rootByName($program->modules, 'Afstudeerrichting delta');

        self::assertCount(1, $delta->children);
        self::assertSame('Keuzepakketten', $delta->children[0]->name);
        self::assertCount(2, $delta->children[0]->children, 'holding Keuzepakket A and B');
    }

    /**
     * Semesterising a branch that holds packages must not swallow them: their courses would land
     * in the Semester folders *and* in the Keuzepakketten folder, and a package offered only by
     * this branch would disappear from the tree altogether.
     */
    public function testSemesterizeKeepsPackagesAsideWhenGroupingIsOn(): void
    {
        $program = $this->map(
            electiveGrouping: ProgramTreeMapper::ELECTIVES_PER_TRACK,
            merge: false,
            semester: ['Afstudeerrichting alfa'],
        );
        $alfa = $this->rootByName($program->modules, 'Afstudeerrichting alfa');

        $names = array_map(static fn (ModuleData $m): string => $m->name, $alfa->children);
        self::assertContains('Keuzepakketten', $names, 'packages survive semesterize');

        // The Semester folders hold the compulsory course only — no package courses.
        $semesterCourses = [];
        foreach ($alfa->children as $child) {
            if (!str_starts_with($child->name, 'Semester')) {
                continue;
            }
            foreach ($child->courses as $course) {
                $semesterCourses[] = $course->code;
            }
        }
        sort($semesterCourses);
        self::assertSame(['A0001A'], $semesterCourses);

        $folder = $this->childByName($alfa, 'Keuzepakketten');
        self::assertSame(
            ['Keuzepakket A', 'Keuzepakket B', 'Keuzepakket C'],
            array_map(static fn (ModuleData $m): string => $m->name, $folder->children),
        );
    }

    /**
     * With grouping off, semesterize keeps its original meaning: the packages are ordinary folders
     * and their courses are regrouped along with everything else.
     */
    public function testSemesterizeStillDissolvesPackagesWhenGroupingIsNone(): void
    {
        $program = $this->map(
            electiveGrouping: ProgramTreeMapper::ELECTIVES_NONE,
            merge: false,
            semester: ['Afstudeerrichting alfa'],
        );
        $alfa = $this->rootByName($program->modules, 'Afstudeerrichting alfa');

        $codes = [];
        foreach ($alfa->children as $child) {
            self::assertStringStartsWith('Semester', $child->name);
            foreach ($child->courses as $course) {
                $codes[] = $course->code;
            }
        }
        sort($codes);
        self::assertSame(['A0001A', 'A0002A', 'A0003A', 'A0004A'], $codes);
    }

    /**
     * @param list<string> $flatten
     * @param list<string> $semester
     */
    private function map(
        string $electiveGrouping,
        bool $merge,
        string $language = 'nl',
        array $flatten = [],
        array $semester = [],
    ): \App\Service\Onderwijsaanbod\Dto\ProgramData {
        $program = $this->mapper->map($this->source, '888', $language, $flatten, $semester, $merge, $electiveGrouping);
        self::assertNotNull($program);

        return $program;
    }

    /**
     * @param list<ModuleData> $modules
     */
    private function rootByName(array $modules, string $name): ModuleData
    {
        foreach ($modules as $module) {
            if ($module->name === $name) {
                return $module;
            }
        }
        self::fail(sprintf('Root module "%s" not found', $name));
    }

    private function childByName(ModuleData $parent, string $name): ModuleData
    {
        foreach ($parent->children as $child) {
            if ($child->name === $name) {
                return $child;
            }
        }
        self::fail(sprintf('Child module "%s" not found', $name));
    }
}
