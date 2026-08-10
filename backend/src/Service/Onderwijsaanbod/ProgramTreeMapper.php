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
 *   - electiveGrouping: gather the lettered "Keuzepakket A".. groups into a "Keuzepakketten"
 *                  folder, either one per afstudeerrichting or a single one at the programme root.
 *                  Runs before merge, and unlike the others it selects by moduleGroupType + name
 *                  rather than by caller-supplied keys. Both modes deduplicate the packages, which
 *                  the API repeats verbatim under every track that offers them.
 *
 * KU Leuven terminology note: in this API a "module" (with an ectsCode) is what we call a Course,
 * a "moduleGroup" is what we call a Module, and a "program" is our Program.
 */
class ProgramTreeMapper
{
    /** Leave the lettered keuzepakketten where the API puts them. */
    public const ELECTIVES_NONE = 'none';
    /** One "Keuzepakketten" folder per afstudeerrichting, holding that track's own packages. */
    public const ELECTIVES_PER_TRACK = 'perTrack';
    /** A single "Keuzepakketten" folder at the root of the programme. */
    public const ELECTIVES_PROGRAMME = 'programme';

    /** @var list<string> Accepted $electiveGrouping values. */
    public const ELECTIVE_GROUPINGS = [self::ELECTIVES_NONE, self::ELECTIVES_PER_TRACK, self::ELECTIVES_PROGRAMME];

    /** Synthetic kulId prefix for the elective-packages folder, mirroring the "sem:" convention. */
    private const ELECTIVE_FOLDER_PREFIX = 'keuzepakketten:';

    /**
     * The lettered "Keuzepakket A".."Keuzepakket H" / "Elective Package A".. groups.
     *
     * Deliberately narrow. KU Leuven also uses "Keuzepakket <name>" for genuinely distinct
     * packages ("Keuzepakket accountancy", "Keuzepakket verzekeringen" in the law/business
     * masters), which are already meaningful siblings and must be left where they are; only a
     * short letter/number suffix qualifies. Both language variants are always matched, because
     * the import language is a user choice and the EN titles read "Elective Package A".
     */
    private const ELECTIVE_PACKAGE_PATTERN = '/^(keuzepakket|elective package)\s+[a-z0-9]{1,2}$/iu';

    /**
     * @param array<string, mixed> $programSource the `_source` of a programme document
     * @param string               $programId     which bundled programme version to map
     * @param 'nl'|'en'            $language       language for program/module/course titles
     * @param list<string>         $flattenKeys   moduleGroupIds or names whose folder is skipped
     * @param list<string>         $semesterKeys  moduleGroupIds or names to regroup by semester
     * @param bool                 $mergeSingleChild collapse single-child, course-less modules
     * @param string               $electiveGrouping one of self::ELECTIVE_GROUPINGS
     */
    public function map(
        array $programSource,
        string $programId,
        string $language = 'nl',
        array $flattenKeys = [],
        array $semesterKeys = [],
        bool $mergeSingleChild = true,
        string $electiveGrouping = self::ELECTIVES_PER_TRACK,
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

        $roots = $this->buildNamedTree($programSet, $language, $programId);
        $roots = $this->unwrapRedundantProgramRoots($roots, $name);

        if ($semesterKeys !== []) {
            // Semesterising a branch that also holds keuzepakketten must not swallow them: their
            // courses would end up inside the Semester folders *and*, via the grouping below, in
            // the Keuzepakketten folder, while a package offered by only this branch would vanish
            // from the tree entirely. Keeping them aside is only correct when the grouping runs —
            // with ELECTIVES_NONE the packages are ordinary folders and semesterize keeps its
            // original meaning of "regroup this whole subtree".
            $keepPackages = $electiveGrouping !== self::ELECTIVES_NONE;
            $roots = array_map(
                fn (ModuleData $m): ModuleData => $this->applySemesterize($m, $programId, $semesterKeys, $keepPackages),
                $roots,
            );
        }
        if ($flattenKeys !== []) {
            $roots = array_map(fn (ModuleData $m): ModuleData => $this->applyFlatten($m, $flattenKeys), $roots);
        }
        // One registry per map() call so a package shared by several afstudeerrichtingen resolves
        // to a single ModuleData (and therefore a single Module row) across the whole programme.
        /** @var array<string, ModuleData> $registry */
        $registry = [];
        if ($electiveGrouping === self::ELECTIVES_PER_TRACK) {
            // A foreach, not array_map(fn ...): arrow functions capture by value, so passing
            // $registry into one would hand every root its own empty copy and defeat the
            // cross-track deduplication entirely.
            foreach ($roots as $i => $root) {
                $roots[$i] = $this->applyGroupElectives($root, $language, $programId, $registry);
            }
        } elseif ($electiveGrouping === self::ELECTIVES_PROGRAMME) {
            $roots = $this->applyHoistElectives($roots, $language, $programId, $registry);
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
    private function buildNamedTree(array $programSet, string $language, string $programId): array
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
            // moduleGroupType "01" = Optie (elective), "02" = Groep (compulsory structural group).
            // Those are the only two values the API uses.
            $isElective = (string) ($group['moduleGroupType'] ?? '') === '01';
            // Namespaced with the programId: KU Leuven reuses a moduleGroupId across programmes
            // (76 of 1696 in the corpus), and the importer matches modules on kulId alone, so a
            // bare id would let importing one programme re-parent another programme's module.
            $module = new ModuleData($this->scopedKulId($programId, $id), $name, isElective: $isElective);
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
     * @param bool         $keepPackages lift elective packages out instead of dissolving them
     */
    private function applySemesterize(ModuleData $module, string $programId, array $keys, bool $keepPackages): ModuleData
    {
        if ($this->matches($module, $keys)) {
            return $this->toSemesterModule($module, $programId, $keepPackages);
        }

        $children = array_map(
            fn (ModuleData $c): ModuleData => $this->applySemesterize($c, $programId, $keys, $keepPackages),
            $module->children,
        );

        return new ModuleData($module->kulId, $module->name, $children, $module->courses, $module->isElective);
    }

    /**
     * Turn a module into one keeping its name but whose children are "Semester N" folders holding
     * every course from its former subtree. The semester number spans the whole degree
     * ((stage - 1) * 2 + within-year semester), so a 3-year bachelor yields Semester 1..6.
     *
     * With $keepPackages the lettered keuzepakketten are excluded from that sweep and re-attached
     * after the Semester folders, so the elective grouping can still fold them into their own
     * folder. A keuzepakket is a choose-one unit, not something that decomposes by semester.
     */
    private function toSemesterModule(ModuleData $module, string $programId, bool $keepPackages): ModuleData
    {
        /** @var array<int, ModuleData> $bySemester keyed by degree-wide semester (0 = unknown) */
        $bySemester = [];
        foreach ($this->collectCourses($module, $keepPackages) as $course) {
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

        $children = array_values($bySemester);
        if ($keepPackages) {
            foreach ($this->findPackages($module) as $package) {
                $children[] = $package;
            }
        }

        return new ModuleData($module->kulId, $module->name, $children, [], $module->isElective);
    }

    /**
     * Every lettered keuzepakket anywhere below $module, in tree order.
     *
     * @return list<ModuleData>
     */
    private function findPackages(ModuleData $module): array
    {
        $packages = [];
        foreach ($module->children as $child) {
            if ($this->isElectivePackage($child)) {
                $packages[] = $child;
                continue;
            }
            foreach ($this->findPackages($child) as $nested) {
                $packages[] = $nested;
            }
        }

        return $packages;
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
        $result = new ModuleData($module->kulId, $module->name, [], $module->courses, $module->isElective);
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
     * Gather the lettered keuzepakketten into a "Keuzepakketten" folder, keeping each package
     * intact as its own sub-module — they are alternatives a student picks between, so merging
     * their courses into one flat list would misrepresent them.
     *
     * KU Leuven re-declares the same package under every afstudeerrichting that offers it, each
     * time with a fresh moduleGroupId: in the bachelor ingenieurswetenschappen "Keuzepakket B"
     * appears 5 times and "Keuzepakket F" 6 times, always with identical courses. Left alone that
     * is ~25 Module rows for 8 real packages, so both modes deduplicate by name via
     * $registry: the *same* ModuleData instance (hence the same synthetic kulId, hence one row)
     * is reused everywhere the package occurs, and Module->modules being a ManyToMany lets that
     * single row hang under several parents.
     *
     * @param array<string, ModuleData> $registry deduplicated packages, keyed by lowercased name
     */
    private function applyGroupElectives(ModuleData $module, string $language, string $programId, array &$registry): ModuleData
    {
        // Loop rather than array_map(fn ...) so $registry stays the same array by reference —
        // see the note in map().
        $children = [];
        foreach ($module->children as $child) {
            $children[] = $this->applyGroupElectives($child, $language, $programId, $registry);
        }

        $packages = array_values(array_filter($children, fn (ModuleData $c): bool => $this->isElectivePackage($c)));
        // A lone package needs no folder: wrapping one child in a wrapper adds a level and says
        // nothing. Two or more is what makes a "choose one of these" group worth showing.
        if (count($packages) < 2) {
            return new ModuleData($module->kulId, $module->name, $children, $module->courses, $module->isElective);
        }

        // Again a loop, not array_map(fn ...): this is the call that actually populates the
        // registry, so capturing it by value would silently disable deduplication.
        $resolved = [];
        foreach ($packages as $package) {
            $resolved[] = $this->dedupePackage($package, $programId, $registry);
        }

        $folder = new ModuleData(
            self::ELECTIVE_FOLDER_PREFIX . $module->kulId,
            $this->electiveFolderName($language),
            $resolved,
            [],
            isElective: true,
        );

        return new ModuleData(
            $module->kulId,
            $module->name,
            $this->replacePackagesWith($children, $folder),
            $module->courses,
            $module->isElective,
        );
    }

    /**
     * Lift every lettered keuzepakket out of the tree into one deduplicated folder at the root of
     * the programme. Cleaner than a folder per afstudeerrichting, but it drops the information of
     * which afstudeerrichting may choose which package — the sets genuinely differ (in the
     * bachelor, computerwetenschappen offers B/C/F/G while materiaalkunde offers B/D/F/H).
     *
     * @param list<ModuleData>          $roots
     * @param array<string, ModuleData> $registry
     *
     * @return list<ModuleData>
     */
    private function applyHoistElectives(array $roots, string $language, string $programId, array &$registry): array
    {
        /** @var list<ModuleData> $packages */
        $packages = [];
        $this->collectPackages($roots, $programId, $registry, $packages);

        if (count($packages) < 2) {
            return $roots;
        }

        usort($packages, static fn (ModuleData $a, ModuleData $b): int => strnatcasecmp($a->name, $b->name));

        $stripped = array_map(fn (ModuleData $m): ModuleData => $this->stripPackages($m), $roots);
        $stripped[] = new ModuleData(
            self::ELECTIVE_FOLDER_PREFIX . $programId,
            $this->electiveFolderName($language),
            $packages,
            [],
            isElective: true,
        );

        return $stripped;
    }

    /**
     * Walk the tree gathering every lettered keuzepakket, deduplicated, in first-seen order.
     *
     * @param list<ModuleData>          $modules
     * @param array<string, ModuleData> $registry
     * @param list<ModuleData>          $collected
     */
    private function collectPackages(array $modules, string $programId, array &$registry, array &$collected): void
    {
        foreach ($modules as $module) {
            if ($this->isElectivePackage($module)) {
                $resolved = $this->dedupePackage($module, $programId, $registry);
                if (!in_array($resolved, $collected, true)) {
                    $collected[] = $resolved;
                }
                continue;
            }
            $this->collectPackages($module->children, $programId, $registry, $collected);
        }
    }

    /**
     * Remove every lettered keuzepakket from a subtree.
     */
    private function stripPackages(ModuleData $module): ModuleData
    {
        /** @var list<ModuleData> $kept */
        $kept = [];
        foreach ($module->children as $child) {
            if ($this->isElectivePackage($child)) {
                continue;
            }
            $kept[] = $this->stripPackages($child);
        }

        return new ModuleData($module->kulId, $module->name, $kept, $module->courses, $module->isElective);
    }

    /**
     * Return the one shared ModuleData standing for this package, creating it on first sight.
     *
     * The synthetic kulId is programme-scoped and derived from the *name* rather than from any of
     * the duplicated moduleGroupIds, so re-imports stay idempotent no matter which occurrence is
     * met first, and it stays stable when a package's course list changes between years.
     *
     * Two packages are only treated as the same when their course sets match as well. In every
     * programme observed the name already implies the courses (in the bachelor, all 5 copies of
     * "Keuzepakket B" carry exactly H01L8A + H01N2A), but a same-name/different-courses pair would
     * otherwise be silently merged into a union — so such a package is instead left alone, keeping
     * its own moduleGroupId and staying a separate module.
     *
     * @param array<string, ModuleData> $registry
     */
    private function dedupePackage(ModuleData $package, string $programId, array &$registry): ModuleData
    {
        $key = mb_strtolower(trim($package->name));
        $slug = preg_replace('/[^a-z0-9]+/u', '-', $key) ?? $key;

        if (!isset($registry[$key])) {
            $registry[$key] = new ModuleData(
                sprintf('keuzepakket:%s:%s', $programId, trim($slug, '-')),
                $package->name,
                $package->children,
                $package->courses,
                isElective: true,
            );

            return $registry[$key];
        }

        $shared = $registry[$key];

        return $this->courseSignature($shared) === $this->courseSignature($package) ? $shared : $package;
    }

    /**
     * Order-independent fingerprint of a module's own course codes.
     */
    private function courseSignature(ModuleData $module): string
    {
        $codes = array_map(static fn (CourseData $c): string => $c->code, $module->courses);
        sort($codes);

        return implode(',', $codes);
    }

    /**
     * Swap the run of packages in a child list for the folder, at the position of the first one so
     * the surrounding order is untouched.
     *
     * @param list<ModuleData> $children
     *
     * @return list<ModuleData>
     */
    private function replacePackagesWith(array $children, ModuleData $folder): array
    {
        /** @var list<ModuleData> $kept */
        $kept = [];
        $placed = false;
        foreach ($children as $child) {
            if (!$this->isElectivePackage($child)) {
                $kept[] = $child;
                continue;
            }
            if (!$placed) {
                $kept[] = $folder;
                $placed = true;
            }
        }

        return $kept;
    }

    private function electiveFolderName(string $language): string
    {
        return $language === 'en' ? 'Elective Packages' : 'Keuzepakketten';
    }

    /**
     * Whether a module is one of the lettered keuzepakketten (see the pattern's docblock for why
     * the name test is this strict).
     */
    private function isElectivePackage(ModuleData $module): bool
    {
        return $module->isElective && preg_match(self::ELECTIVE_PACKAGE_PATTERN, trim($module->name)) === 1;
    }

    /**
     * Collapse a module that has exactly one child module and no own courses into that child,
     * removing the redundant wrapper. Applied depth-first.
     */
    private function mergeSingleChild(ModuleData $module): ModuleData
    {
        $children = array_map(fn (ModuleData $c): ModuleData => $this->mergeSingleChild($c), $module->children);

        // A parent whose only remaining child is the elective folder must keep its own identity:
        // merging would replace a meaningful name ("Afstudeerrichting werktuigkunde") with the
        // generic folder name ("Keuzepakketten"). The wrapper is not redundant here — the folder
        // only exists because the elective grouping created it.
        $onlyChildIsElectiveFolder = count($children) === 1
            && str_starts_with($children[0]->kulId, self::ELECTIVE_FOLDER_PREFIX);

        if (count($children) === 1 && $module->courses === [] && !$onlyChildIsElectiveFolder) {
            return $children[0];
        }

        return new ModuleData($module->kulId, $module->name, $children, $module->courses, $module->isElective);
    }

    /**
     * Namespace a KU Leuven moduleGroupId with the programme it belongs to, so modules stay
     * distinct per programme even when KU Leuven reuses the id.
     */
    private function scopedKulId(string $programId, string $moduleGroupId): string
    {
        return $programId . ':' . $moduleGroupId;
    }

    /**
     * @param list<string> $keys moduleGroupIds or (case-insensitive) group names
     */
    private function matches(ModuleData $module, array $keys): bool
    {
        foreach ($keys as $key) {
            // The bare moduleGroupId is still accepted alongside the namespaced one: saved import
            // settings and CLI invocations from before the namespacing carry the raw id.
            $bare = str_contains($module->kulId, ':')
                ? substr($module->kulId, (int) strpos($module->kulId, ':') + 1)
                : $module->kulId;
            if (
                $module->kulId === $key
                || $bare === $key
                || mb_strtolower(trim($module->name)) === mb_strtolower(trim($key))
            ) {
                return true;
            }
        }

        return false;
    }

    /**
     * All courses in a module and its descendants (de-duplicated by code, preserving order).
     *
     * @param bool $skipPackages leave the courses of lettered keuzepakketten out entirely
     *
     * @return list<CourseData>
     */
    private function collectCourses(ModuleData $module, bool $skipPackages = false): array
    {
        /** @var array<string, CourseData> $byCode */
        $byCode = [];
        $walk = function (ModuleData $m) use (&$walk, &$byCode, $skipPackages): void {
            foreach ($m->courses as $course) {
                $byCode[$course->code] ??= $course;
            }
            foreach ($m->children as $child) {
                if ($skipPackages && $this->isElectivePackage($child)) {
                    continue;
                }
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
