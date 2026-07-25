<?php

namespace App\Service\Onderwijsaanbod;

use App\Service\Onderwijsaanbod\Dto\CourseData;
use App\Service\Onderwijsaanbod\Dto\ModuleData;
use App\Service\Onderwijsaanbod\Dto\ProgramData;

/**
 * Pure transformation of a raw KU Leuven programme document into an in-memory ProgramData tree.
 * Holds no database or HTTP state, so it is fully unit-testable against saved API fixtures.
 *
 * KU Leuven terminology note: in this API a "module" (with an ectsCode) is what we call a Course,
 * a "moduleGroup" is what we call a Module, and a "program" is our Program.
 */
class ProgramTreeMapper
{
    /**
     * @param array<string, mixed> $programSource the `_source` of a programme document
     * @param string               $programId     which bundled programme version to map
     * @param list<string>         $flattenNames  module-group names whose folder is skipped
     *                                            (courses attach to the parent); named mode only
     * @param 'nl'|'en'            $language       language for program/module/course titles
     */
    public function map(
        array $programSource,
        string $programId,
        GroupingMode $mode,
        array $flattenNames = [],
        string $language = 'nl',
    ): ?ProgramData {
        $programSet = $this->findProgramSet($programSource, $programId);
        if ($programSet === null) {
            return null;
        }

        $name = $this->localized(
            $programSet['programLanguageSet'] ?? [],
            'programLangu',
            'programTitleSet',
            $language,
        ) ?? $programId;

        $modules = $mode === GroupingMode::Named
            ? $this->buildNamedTree($programSet, $programId, $flattenNames, $language)
            : $this->buildStageTree($programSet, $programId, $language);

        return new ProgramData($programId, $name, $modules);
    }

    /**
     * Named grouping: mirror the moduleGroupSet tree, honouring flatten names.
     *
     * @param array<string, mixed> $programSet
     * @param list<string>         $flattenNames
     *
     * @return list<ModuleData>
     */
    private function buildNamedTree(array $programSet, string $programId, array $flattenNames, string $language): array
    {
        $flatten = array_map(static fn (string $n): string => mb_strtolower(trim($n)), $flattenNames);

        /** @var array<string, array<string, mixed>> $groups indexed by moduleGroupId */
        $groups = [];
        foreach ($programSet['moduleGroupSet'] ?? [] as $group) {
            $id = isset($group['moduleGroupId']) ? (string) $group['moduleGroupId'] : null;
            if ($id !== null) {
                $groups[$id] = $group;
            }
        }

        $nameOf = fn (array $group): string => $this->localized(
            $group['moduleGroupLanguageSet'] ?? [],
            'moduleGroupLangu',
            'moduleGroupTitleSet',
            $language,
        ) ?? '';

        // A group is flattened only if it actually has a non-flattened ancestor to hoist into;
        // the top of the tree can never be flattened away (courses need a Module to live in).
        $isFlattened = function (string $id) use ($groups, $nameOf, $flatten): bool {
            $group = $groups[$id] ?? null;
            if ($group === null) {
                return false;
            }
            if (!in_array(mb_strtolower(trim($nameOf($group))), $flatten, true)) {
                return false;
            }
            $parentType = (string) ($group['parentType'] ?? '');
            $parentId = (string) ($group['parentId'] ?? '');

            return $parentType === 'modulegroup' && isset($groups[$parentId]);
        };

        // Nearest ancestor-or-self group id that is NOT flattened (null => attach at program root).
        $effectiveHost = function (string $id) use (&$effectiveHost, $groups, $isFlattened): ?string {
            if (!$isFlattened($id)) {
                return $id;
            }
            $group = $groups[$id];
            $parentId = (string) ($group['parentId'] ?? '');

            return isset($groups[$parentId]) ? $effectiveHost($parentId) : null;
        };

        // Create a ModuleData for every non-flattened group.
        /** @var array<string, ModuleData> $modulesById */
        $modulesById = [];
        foreach ($groups as $id => $group) {
            if (!$isFlattened($id)) {
                $modulesById[$id] = new ModuleData($id, $nameOf($group));
            }
        }

        /** @var list<ModuleData> $roots */
        $roots = [];
        // Wire up the module hierarchy.
        foreach ($groups as $id => $group) {
            if ($isFlattened($id)) {
                continue;
            }
            $parentType = (string) ($group['parentType'] ?? '');
            $parentId = (string) ($group['parentId'] ?? '');
            $host = $parentType === 'modulegroup' ? $effectiveHost($parentId) : null;
            if ($host !== null && isset($modulesById[$host])) {
                $modulesById[$host]->addChild($modulesById[$id]);
            } else {
                $roots[] = $modulesById[$id];
            }
        }

        // Attach courses to the module of their nearest non-flattened ancestor-or-self.
        foreach ($groups as $id => $group) {
            $host = $effectiveHost($id);
            $target = $host !== null ? ($modulesById[$host] ?? null) : null;
            if ($target === null) {
                // Flattened all the way to the program root: keep the group as its own module
                // rather than dropping its courses (courses cannot hang directly off a Program).
                $target = $modulesById[$id] ??= new ModuleData($id, $nameOf($group));
                if (!in_array($target, $roots, true)) {
                    $roots[] = $target;
                }
            }
            foreach ($this->coursesOf($group, $language) as $course) {
                $this->addCourseOnce($target, $course);
            }
        }

        return $roots;
    }

    /**
     * Stage grouping: one top-level module per study stage ("Fase 1"...), courses placed by
     * their starting stage. Flatten names do not apply here.
     *
     * @param array<string, mixed> $programSet
     *
     * @return list<ModuleData>
     */
    private function buildStageTree(array $programSet, string $programId, string $language): array
    {
        /** @var array<int, ModuleData> $stages */
        $stages = [];

        foreach ($programSet['moduleGroupSet'] ?? [] as $group) {
            foreach ($group['moduleSet'] ?? [] as $module) {
                $course = $this->toCourse($module, $language);
                if ($course === null) {
                    continue;
                }
                $stage = isset($module['stageStart']) && is_numeric($module['stageStart'])
                    ? (int) $module['stageStart']
                    : null;
                if ($stage === null || $stage < 1) {
                    continue;
                }
                if (!isset($stages[$stage])) {
                    $label = $language === 'en' ? sprintf('Phase %d', $stage) : sprintf('Fase %d', $stage);
                    $stages[$stage] = new ModuleData(sprintf('stage:%s:%d', $programId, $stage), $label);
                }
                $this->addCourseOnce($stages[$stage], $course);
            }
        }

        ksort($stages);

        return array_values($stages);
    }

    /**
     * Course DTOs contained directly in a module group.
     *
     * @param array<string, mixed> $group
     *
     * @return list<CourseData>
     */
    private function coursesOf(array $group, string $language): array
    {
        $courses = [];
        foreach ($group['moduleSet'] ?? [] as $module) {
            $course = $this->toCourse($module, $language);
            if ($course !== null) {
                $courses[] = $course;
            }
        }

        return $courses;
    }

    /**
     * @param array<string, mixed> $module a moduleSet entry (a course within a group)
     */
    private function toCourse(array $module, string $language): ?CourseData
    {
        $code = isset($module['short']) ? strtoupper(trim((string) $module['short'])) : '';
        if ($code === '') {
            return null;
        }

        $name = $this->localized(
            $module['moduleLanguageSet'] ?? [],
            'moduleLangu',
            'moduleTitleSet',
            $language,
        ) ?? $code;

        $credits = isset($module['credits']) && is_numeric($module['credits'])
            ? (int) $module['credits']
            : null;

        return new CourseData(
            code: $code,
            name: $name,
            language: $this->normalizeLanguage((string) ($module['originalLangu'] ?? '')),
            credits: $credits,
            semesters: $this->semestersOf($module),
            mandatory: filter_var($module['mandatory'] ?? true, FILTER_VALIDATE_BOOL),
            kulModuleId: isset($module['moduleId']) ? (string) $module['moduleId'] : null,
        );
    }

    /**
     * Semesters are not language-specific, so read them from any available language set.
     *
     * @param array<string, mixed> $module
     *
     * @return list<string> subset of Course::SEMESTERS values
     */
    private function semestersOf(array $module): array
    {
        $semesters = [];
        foreach ($module['moduleLanguageSet'] ?? [] as $lang) {
            foreach ($lang['moduleSessionPatternSet'] ?? [] as $pattern) {
                $period = (string) ($pattern['offerPeriod'] ?? '');
                $semester = match ($period) {
                    '1' => 'Semester 1',
                    '2' => 'Semester 2',
                    default => null,
                };
                if ($semester !== null && !in_array($semester, $semesters, true)) {
                    $semesters[] = $semester;
                }
            }
        }

        return $semesters;
    }

    /**
     * @param array<string, mixed> $programSource
     *
     * @return array<string, mixed>|null
     */
    private function findProgramSet(array $programSource, string $programId): ?array
    {
        foreach ($programSource['programSet'] ?? [] as $programSet) {
            if ((string) ($programSet['programId'] ?? '') === $programId) {
                return $programSet;
            }
        }

        return null;
    }

    /**
     * Pull a localized description out of a KU Leuven "...LanguageSet" structure, preferring the
     * requested language and falling back to any available one.
     *
     * @param list<array<string, mixed>> $languageSet
     */
    private function localized(array $languageSet, string $languKey, string $titleSetKey, string $language): ?string
    {
        $fallback = null;
        foreach ($languageSet as $entry) {
            $entryLangu = strtoupper((string) ($entry[$languKey] ?? ''));
            foreach ($entry[$titleSetKey] ?? [] as $title) {
                $description = trim((string) ($title['description'] ?? ''));
                if ($description === '') {
                    continue;
                }
                if ($entryLangu === strtoupper($language)) {
                    return $description;
                }
                $fallback ??= $description;
            }
        }

        return $fallback;
    }

    /**
     * @return 'nl'|'en'
     */
    private function normalizeLanguage(string $langu): string
    {
        return str_starts_with(strtolower($langu), 'en') ? 'en' : 'nl';
    }

    private function addCourseOnce(ModuleData $module, CourseData $course): void
    {
        foreach ($module->courses as $existing) {
            if ($existing->code === $course->code) {
                return;
            }
        }
        $module->addCourse($course);
    }
}
