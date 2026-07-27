<?php

namespace App\Service\Onderwijsaanbod;

use App\Service\Onderwijsaanbod\Dto\CourseData;
use App\Service\Onderwijsaanbod\Dto\ModuleData;
use App\Service\Onderwijsaanbod\Dto\ProgramData;

/**
 * Pure transformation of a raw KU Leuven programme document into an in-memory ProgramData tree.
 * Holds no database or HTTP state, so it is fully unit-testable against saved API fixtures.
 *
 * The KU Leuven "named" module-group tree is always the base structure. On top of it a few
 * composable transforms can be applied, each selecting groups by their moduleGroupId or by their
 * (case-insensitive) name so both the CLI (names) and the admin wizard (ids) can drive them:
 *
 *   - semesterize: replace a group's whole subtree with degree-wide "Semester N" folders, e.g. the
 *     common-core block regrouped by semester while the specialisation tracks keep their form.
 *   - flatten:     drop a group's own folder; its courses attach to the parent, its children move up.
 *   - merge:       collapse any module that has a single child module and no own courses.
 *
 * KU Leuven terminology note: in this API a "module" (with an ectsCode) is what we call a Course,
 * a "moduleGroup" is what we call a Module, and a "program" is our Program.
 */
class ProgramTreeMapper
{
    /**
     * @param array<string, mixed> $programSource the `_source` of a programme document
     * @param string               $programId     which bundled programme version to map
     * @param 'nl'|'en'            $language       language for program/module/course titles
     * @param list<string>         $flattenKeys   moduleGroupIds or names whose folder is skipped
     * @param list<string>         $semesterKeys  moduleGroupIds or names to regroup by semester
     * @param bool                 $mergeSingleChild collapse single-child, course-less modules
     */
    public function map(
        array $programSource,
        string $programId,
        string $language = 'nl',
        array $flattenKeys = [],
        array $semesterKeys = [],
        bool $mergeSingleChild = true,
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

        $roots = $this->buildNamedTree($programSet, $language);
        $roots = $this->unwrapRedundantProgramRoots($roots, $name);

        if ($semesterKeys !== []) {
            $roots = array_map(fn (ModuleData $m): ModuleData => $this->applySemesterize($m, $programId, $semesterKeys), $roots);
        }
        if ($flattenKeys !== []) {
            $roots = array_map(fn (ModuleData $m): ModuleData => $this->applyFlatten($m, $flattenKeys), $roots);
        }
        if ($mergeSingleChild) {
            $roots = array_map(fn (ModuleData $m): ModuleData => $this->mergeSingleChild($m), $roots);
        }

        return new ProgramData($programId, $name, $roots);
    }

    /**
     * Build the full KU Leuven named module-group tree (no transforms yet).
     *
     * @param array<string, mixed> $programSet
     *
     * @return list<ModuleData>
     */
    private function buildNamedTree(array $programSet, string $language): array
    {
        /** @var array<string, array<string, mixed>> $groups indexed by moduleGroupId */
        $groups = [];
        foreach ($programSet['moduleGroupSet'] ?? [] as $group) {
            $id = isset($group['moduleGroupId']) ? (string) $group['moduleGroupId'] : null;
            if ($id !== null) {
                $groups[$id] = $group;
            }
        }

        /** @var array<string, ModuleData> $modulesById */
        $modulesById = [];
        foreach ($groups as $id => $group) {
            $name = $this->localized(
                $group['moduleGroupLanguageSet'] ?? [],
                'moduleGroupLangu',
                'moduleGroupTitleSet',
                $language,
            ) ?? '';
            $module = new ModuleData($id, $name);
            foreach ($this->coursesOf($group, $language) as $course) {
                $this->addCourseOnce($module, $course);
            }
            $modulesById[$id] = $module;
        }

        /** @var list<ModuleData> $roots */
        $roots = [];
        foreach ($groups as $id => $group) {
            $parentType = (string) ($group['parentType'] ?? '');
            $parentId = (string) ($group['parentId'] ?? '');
            if ($parentType === 'modulegroup' && isset($modulesById[$parentId])) {
                $modulesById[$parentId]->addChild($modulesById[$id]);
            } else {
                $roots[] = $modulesById[$id];
            }
        }

        return $roots;
    }

    /**
     * Replace the subtree of any module matching $keys with degree-wide "Semester N" folders,
     * recursing into non-matching modules so a nested common-core block is caught too.
     *
     * @param list<string> $keys
     */
    private function applySemesterize(ModuleData $module, string $programId, array $keys): ModuleData
    {
        if ($this->matches($module, $keys)) {
            return $this->toSemesterModule($module, $programId);
        }

        $children = array_map(fn (ModuleData $c): ModuleData => $this->applySemesterize($c, $programId, $keys), $module->children);

        return new ModuleData($module->kulId, $module->name, $children, $module->courses);
    }

    /**
     * Turn a module into one keeping its name but whose children are "Semester N" folders holding
     * every course from its former subtree. The semester number spans the whole degree
     * ((stage - 1) * 2 + within-year semester), so a 3-year bachelor yields Semester 1..6.
     */
    private function toSemesterModule(ModuleData $module, string $programId): ModuleData
    {
        /** @var array<int, ModuleData> $bySemester keyed by degree-wide semester (0 = unknown) */
        $bySemester = [];
        foreach ($this->collectCourses($module) as $course) {
            foreach ($this->semesterNumbers($course) as $number) {
                if (!isset($bySemester[$number])) {
                    $label = $number > 0 ? sprintf('Semester %d', $number) : 'Overige vakken';
                    $bySemester[$number] = new ModuleData(sprintf('sem:%s:%s:%d', $programId, $module->kulId, $number), $label);
                }
                $this->addCourseOnce($bySemester[$number], $course);
            }
        }

        ksort($bySemester);
        // Show the "unknown" bucket (key 0) last rather than first.
        if (isset($bySemester[0])) {
            $unknown = $bySemester[0];
            unset($bySemester[0]);
            $bySemester[] = $unknown;
        }

        return new ModuleData($module->kulId, $module->name, array_values($bySemester));
    }

    /**
     * Degree-wide semester numbers a course belongs to (usually one; two for a year-long course).
     * Returns [0] when neither stage nor semester is known.
     *
     * @return list<int>
     */
    private function semesterNumbers(CourseData $course): array
    {
        $base = $course->stage !== null ? ($course->stage - 1) * 2 : null;
        $numbers = [];
        foreach ($course->semesters as $semester) {
            $within = $semester === 'Semester 2' ? 2 : 1;
            $numbers[] = $base !== null ? $base + $within : $within;
        }
        if ($numbers === []) {
            // No within-year semester known: fall back to the first semester of the stage, else unknown.
            $numbers[] = $base !== null ? $base + 1 : 0;
        }

        return array_values(array_unique($numbers));
    }

    /**
     * Dissolve any descendant module matching $keys: its courses join this module and its children
     * move up. Roots are never dissolved (courses cannot hang directly off a Program).
     *
     * @param list<string> $keys
     */
    private function applyFlatten(ModuleData $module, array $keys): ModuleData
    {
        $result = new ModuleData($module->kulId, $module->name, [], $module->courses);
        foreach ($module->children as $child) {
            $processed = $this->applyFlatten($child, $keys);
            if ($this->matches($processed, $keys)) {
                foreach ($processed->courses as $course) {
                    $this->addCourseOnce($result, $course);
                }
                foreach ($processed->children as $grandChild) {
                    $result->addChild($grandChild);
                }
            } else {
                $result->addChild($processed);
            }
        }

        return $result;
    }

    /**
     * Collapse a module that has exactly one child module and no own courses into that child,
     * removing the redundant wrapper. Applied depth-first.
     */
    private function mergeSingleChild(ModuleData $module): ModuleData
    {
        $children = array_map(fn (ModuleData $c): ModuleData => $this->mergeSingleChild($c), $module->children);

        if (count($children) === 1 && $module->courses === []) {
            return $children[0];
        }

        return new ModuleData($module->kulId, $module->name, $children, $module->courses);
    }

    /**
     * @param list<string> $keys moduleGroupIds or (case-insensitive) group names
     */
    private function matches(ModuleData $module, array $keys): bool
    {
        foreach ($keys as $key) {
            if ($module->kulId === $key || mb_strtolower(trim($module->name)) === mb_strtolower(trim($key))) {
                return true;
            }
        }

        return false;
    }

    /**
     * All courses in a module and its descendants (de-duplicated by code, preserving order).
     *
     * @return list<CourseData>
     */
    private function collectCourses(ModuleData $module): array
    {
        /** @var array<string, CourseData> $byCode */
        $byCode = [];
        $walk = static function (ModuleData $m) use (&$walk, &$byCode): void {
            foreach ($m->courses as $course) {
                $byCode[$course->code] ??= $course;
            }
            foreach ($m->children as $child) {
                $walk($child);
            }
        };
        $walk($module);

        return array_values($byCode);
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
            stage: isset($module['stageStart']) && is_numeric($module['stageStart']) ? (int) $module['stageStart'] : null,
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
                // offerPeriod 3 = "jaarvak" (year-long course): it runs across both semesters,
                // so it must be marked in Semester 1 AND Semester 2 (both pie halves filled).
                $mapped = match ($period) {
                    '1' => ['Semester 1'],
                    '2' => ['Semester 2'],
                    '3' => ['Semester 1', 'Semester 2'],
                    default => [],
                };
                foreach ($mapped as $semester) {
                    if (!in_array($semester, $semesters, true)) {
                        $semesters[] = $semester;
                    }
                }
            }
        }

        // Keep the canonical order (Semester 1 before Semester 2) regardless of pattern order.
        sort($semesters);

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

    /**
     * Always unwrap top-level wrapper root modules so that the actual structural submodules
     * (e.g. "Gemeenschappelijk deel", "Opties", stage folders) appear directly at the root level of the program.
     *
     * @param list<ModuleData> $roots
     * @return list<ModuleData>
     */
    private function unwrapRedundantProgramRoots(array $roots, string $programName): array
    {
        $cleanProgramName = $this->normalizeNameForComparison($programName);

        $changed = true;
        while ($changed) {
            $changed = false;

            // 1. Always unwrap a single top-level root wrapper module if it has children and no own courses
            if (count($roots) === 1 && $roots[0]->children !== [] && $roots[0]->courses === []) {
                $roots = $roots[0]->children;
                $changed = true;
                continue;
            }

            // 2. Unwrap any root module whose name matches/resembles the program name
            $newRoots = [];
            foreach ($roots as $root) {
                $cleanRootName = $this->normalizeNameForComparison($root->name);

                $isMatch = $cleanRootName !== '' && $cleanProgramName !== '' && (
                    $cleanRootName === $cleanProgramName
                    || (str_starts_with($cleanProgramName, $cleanRootName)
                        && mb_strlen($cleanRootName) >= mb_strlen($cleanProgramName) * 0.8)
                    || (str_starts_with($cleanRootName, $cleanProgramName)
                        && mb_strlen($cleanProgramName) >= mb_strlen($cleanRootName) * 0.8)
                );

                if ($isMatch && $root->courses === [] && $root->children !== []) {
                    foreach ($root->children as $child) {
                        $newRoots[] = $child;
                    }
                    $changed = true;
                } else {
                    $newRoots[] = $root;
                }
            }
            $roots = $newRoots;
        }

        return $roots;
    }

    private function normalizeNameForComparison(string $name): string
    {
        $clean = preg_replace('/\s*\([^)]*\)\s*$/u', '', $name) ?? $name;
        return mb_strtolower(trim($clean));
    }
}
