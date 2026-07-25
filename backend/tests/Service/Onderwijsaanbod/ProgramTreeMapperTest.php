<?php

namespace App\Tests\Service\Onderwijsaanbod;

use App\Service\Onderwijsaanbod\Dto\ModuleData;
use App\Service\Onderwijsaanbod\GroupingMode;
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
        self::assertNull($this->mapper->map($this->source, 'does-not-exist', GroupingMode::Named));
    }

    public function testNamedModeBuildsNestedTreeAndParsesCourseFields(): void
    {
        $program = $this->mapper->map($this->source, '999', GroupingMode::Named, [], 'nl');

        self::assertNotNull($program);
        self::assertSame('999', $program->kulId);
        self::assertSame('Testopleiding', $program->name);

        // Single root "Basis" with two children: "Wiskunde" and "Verplichte..." (not flattened here).
        self::assertCount(1, $program->modules);
        $root = $program->modules[0];
        self::assertSame('Basis', $root->name);
        self::assertSame('g1', $root->kulId);

        $childNames = array_map(static fn (ModuleData $m): string => $m->name, $root->children);
        self::assertContains('Wiskunde', $childNames);
        self::assertContains('Verplichte opleidingsonderdelen', $childNames);

        $wiskunde = $this->childByName($root, 'Wiskunde');
        self::assertCount(1, $wiskunde->courses);
        $course = $wiskunde->courses[0];
        self::assertSame('W0001A', $course->code);
        self::assertSame('Analyse', $course->name);
        self::assertSame('nl', $course->language);
        self::assertSame(6, $course->credits);
        self::assertSame(['Semester 1'], $course->semesters);
        self::assertTrue($course->mandatory);
    }

    public function testFlattenHoistsCoursesToParentAndReparentsChildren(): void
    {
        $program = $this->mapper->map(
            $this->source,
            '999',
            GroupingMode::Named,
            ['Verplichte opleidingsonderdelen'],
            'nl',
        );

        self::assertNotNull($program);
        $root = $program->modules[0];

        // "Verplichte opleidingsonderdelen" must no longer be a module...
        $childNames = array_map(static fn (ModuleData $m): string => $m->name, $root->children);
        self::assertNotContains('Verplichte opleidingsonderdelen', $childNames);

        // ...its course is hoisted onto the parent (root)...
        $rootCourseCodes = array_map(static fn ($c): string => $c->code, $root->courses);
        self::assertContains('V0001A', $rootCourseCodes);

        // ...and its real subgroup "Verdieping" is re-parented up to the root.
        self::assertContains('Verdieping', $childNames);
        $verdieping = $this->childByName($root, 'Verdieping');
        self::assertSame('S0001A', $verdieping->courses[0]->code);
    }

    public function testEnglishFallbackTitleWhenRequestedLanguageMissing(): void
    {
        $program = $this->mapper->map(
            $this->source,
            '999',
            GroupingMode::Named,
            ['Verplichte opleidingsonderdelen'],
            'nl'
        );
        self::assertNotNull($program);
        $root = $program->modules[0];
        $ethics = null;
        foreach ($root->courses as $c) {
            if ($c->code === 'V0001A') {
                $ethics = $c;
            }
        }
        self::assertNotNull($ethics);
        // Only an English title exists for this course; it should fall back rather than show the code.
        self::assertSame('Ethics', $ethics->name);
        self::assertSame('en', $ethics->language);
        self::assertSame(['Semester 2'], $ethics->semesters);
        self::assertFalse($ethics->mandatory);
    }

    public function testStageModeGroupsByStartingStage(): void
    {
        $program = $this->mapper->map($this->source, '999', GroupingMode::Stage, [], 'nl');

        self::assertNotNull($program);
        $names = array_map(static fn (ModuleData $m): string => $m->name, $program->modules);
        self::assertSame(['Fase 1', 'Fase 2'], $names);

        $fase1 = $program->modules[0];
        $fase1Codes = array_map(static fn ($c): string => $c->code, $fase1->courses);
        sort($fase1Codes);
        self::assertSame(['V0001A', 'W0001A'], $fase1Codes);
        self::assertSame('stage:999:1', $fase1->kulId);

        $fase2 = $program->modules[1];
        self::assertSame(['S0001A'], array_map(static fn ($c): string => $c->code, $fase2->courses));
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
