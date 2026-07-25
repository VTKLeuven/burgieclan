<?php

namespace App\Tests\Service\Onderwijsaanbod;

use App\Service\Onderwijsaanbod\Dto\ModuleData;
use App\Service\Onderwijsaanbod\ProgramTreeMapper;
use PHPUnit\Framework\TestCase;

class ProgramTreeMapperTest extends TestCase
{
    private ProgramTreeMapper $mapper;

    /** @var array<string, mixed> */
    private array $source;

    protected function setUp(): void
    {
        $this->mapper = new ProgramTreeMapper();
        $json = file_get_contents(__DIR__ . '/fixtures/program_sample.json');
        self::assertIsString($json);
        $this->source = json_decode($json, true);
    }

    public function testUnknownProgramIdReturnsNull(): void
    {
        self::assertNull($this->mapper->map($this->source, 'does-not-exist'));
    }

    public function testNamedTreeBuildsFullStructureAndParsesCourseFields(): void
    {
        // Merge off so the raw KU Leuven structure is preserved.
        $program = $this->mapper->map($this->source, '999', 'nl', [], [], false);

        self::assertNotNull($program);
        self::assertSame('999', $program->kulId);
        self::assertSame('Testopleiding', $program->name);

        $rootNames = array_map(static fn (ModuleData $m): string => $m->name, $program->modules);
        self::assertSame(['Basis', 'Keuze'], $rootNames);

        $basis = $program->modules[0];
        $wiskunde = $this->childByName($basis, 'Wiskunde');
        $course = $wiskunde->courses[0];
        self::assertSame('W0001A', $course->code);
        self::assertSame('Analyse', $course->name);
        self::assertSame('nl', $course->language);
        self::assertSame(6, $course->credits);
        self::assertSame(['Semester 1'], $course->semesters);
        self::assertSame(1, $course->stage);
        self::assertTrue($course->mandatory);
    }

    public function testFlattenHoistsCoursesToParentAndReparentsChildren(): void
    {
        $program = $this->mapper->map($this->source, '999', 'nl', ['Verplichte opleidingsonderdelen'], [], false);

        self::assertNotNull($program);
        $basis = $program->modules[0];

        $childNames = array_map(static fn (ModuleData $m): string => $m->name, $basis->children);
        self::assertNotContains('Verplichte opleidingsonderdelen', $childNames);

        // Its course is hoisted to the parent...
        self::assertContains('V0001A', array_map(static fn ($c): string => $c->code, $basis->courses));
        // ...and its real subgroup is re-parented up.
        self::assertContains('Verdieping', $childNames);
    }

    public function testEnglishFallbackTitleWhenRequestedLanguageMissing(): void
    {
        $program = $this->mapper->map($this->source, '999', 'nl', ['Verplichte opleidingsonderdelen'], [], false);
        self::assertNotNull($program);
        $basis = $program->modules[0];

        $ethics = null;
        foreach ($basis->courses as $c) {
            if ($c->code === 'V0001A') {
                $ethics = $c;
            }
        }
        self::assertNotNull($ethics);
        self::assertSame('Ethics', $ethics->name);
        self::assertSame('en', $ethics->language);
        self::assertSame(['Semester 2'], $ethics->semesters);
        self::assertFalse($ethics->mandatory);
    }

    public function testMergeCollapsesSingleChildFolder(): void
    {
        // "Keuze" has a single child "Keuzepakket" and no own courses, so it collapses to the child.
        $program = $this->mapper->map($this->source, '999', 'nl', [], [], true);

        self::assertNotNull($program);
        $rootNames = array_map(static fn (ModuleData $m): string => $m->name, $program->modules);
        self::assertContains('Keuzepakket', $rootNames);
        self::assertNotContains('Keuze', $rootNames);
    }

    public function testSemesterizeRegroupsSubtreeByDegreeWideSemester(): void
    {
        // Regroup the "Basis" block by semester; stages 1 and 2 must yield Semester 1, 2 and 3.
        $program = $this->mapper->map($this->source, '999', 'nl', [], ['Basis'], false);

        self::assertNotNull($program);
        $basis = $program->modules[0];
        self::assertSame('Basis', $basis->name);

        $semesterNames = array_map(static fn (ModuleData $m): string => $m->name, $basis->children);
        self::assertSame(['Semester 1', 'Semester 2', 'Semester 3'], $semesterNames);

        // W0001A: stage 1, sem 1 -> Semester 1; V0001A: stage 1, sem 2 -> Semester 2; S0001A: stage 2 -> Semester 3.
        self::assertSame('W0001A', $basis->children[0]->courses[0]->code);
        self::assertSame('V0001A', $basis->children[1]->courses[0]->code);
        self::assertSame('S0001A', $basis->children[2]->courses[0]->code);
        // Named subgroups are gone; the block now holds only semester folders.
        self::assertSame([], $basis->courses);
    }

    public function testUnwrapRedundantProgramRootModule(): void
    {
        $mockSource = [
            'programSet' => [
                [
                    'programId' => '1001',
                    'programLanguageSet' => [
                        [
                            'programLangu' => 'NL',
                            'programTitleSet' => [
                                ['description' => 'Bachelor in de ingenieurswetenschappen (Leuven)'],
                            ],
                        ],
                    ],
                    'moduleGroupSet' => [
                        [
                            'moduleGroupId' => 'G1',
                            'parentType' => 'program',
                            'parentId' => '1001',
                            'moduleGroupLanguageSet' => [
                                [
                                    'moduleGroupLangu' => 'NL',
                                    'moduleGroupTitleSet' => [
                                        ['description' => 'Bachelor in de ingenieurswetenschappen'],
                                    ],
                                ],
                            ],
                        ],
                        [
                            'moduleGroupId' => 'G2',
                            'parentType' => 'modulegroup',
                            'parentId' => 'G1',
                            'moduleGroupLanguageSet' => [
                                [
                                    'moduleGroupLangu' => 'NL',
                                    'moduleGroupTitleSet' => [
                                        ['description' => 'Gemeenschappelijk deel'],
                                    ],
                                ],
                            ],
                        ],
                        [
                            'moduleGroupId' => 'G3',
                            'parentType' => 'modulegroup',
                            'parentId' => 'G1',
                            'moduleGroupLanguageSet' => [
                                [
                                    'moduleGroupLangu' => 'NL',
                                    'moduleGroupTitleSet' => [
                                        ['description' => 'Opties'],
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ];

        $program = $this->mapper->map($mockSource, '1001', 'nl', [], [], false);
        self::assertNotNull($program);

        // The redundant root module "Bachelor in de ingenieurswetenschappen" should be unwrapped!
        $rootNames = array_map(static fn (ModuleData $m): string => $m->name, $program->modules);
        self::assertSame(['Gemeenschappelijk deel', 'Opties'], $rootNames);
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
