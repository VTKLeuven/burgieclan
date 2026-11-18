<?php

namespace App\Service\Onderwijsaanbod;

use App\Entity\Course;
use App\Entity\Module;
use App\Entity\Program;
use App\Repository\CourseRepository;
use App\Repository\ModuleRepository;
use App\Repository\ProgramRepository;
use App\Service\Onderwijsaanbod\Dto\CourseData;
use App\Service\Onderwijsaanbod\Dto\ModuleData;
use App\Service\Onderwijsaanbod\Dto\ProgramData;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Persists a mapped ProgramData tree into Program / Module / Course entities.
 *
 * Matching is idempotent: programs and modules are matched on their kulId, courses on their unique
 * code, so re-running updates in place instead of duplicating. Manually created modules (kulId null)
 * are never touched. Courses removed upstream are reported but never deleted.
 */
class OnderwijsaanbodImporter
{
    public function __construct(
        private readonly ProgramRepository $programRepository,
        private readonly ModuleRepository $moduleRepository,
        private readonly CourseRepository $courseRepository,
        private readonly EntityManagerInterface $entityManager,
        private readonly OnderwijsaanbodClient $client,
    ) {}

    /**
     * @param bool                       $enrich         fetch professors and identical-course links from the OPO index
     * @param bool                       $dryRun         compute the changes but persist nothing
     * @param array<string, mixed>|null  $importSettings import options to persist on the programme
     */
    public function import(
        ProgramData $data,
        bool $enrich = true,
        bool $dryRun = false,
        ?array $importSettings = null,
    ): ImportResult {
        $result = new ImportResult();
        $result->dryRun = $dryRun;

        // A dry run still walks the whole upsert path — that is what makes the preview accurate —
        // so it needs the writes to happen and then not stick. A transaction that is rolled back
        // does exactly that. The previous approach (flush nothing, then EntityManager::clear())
        // detached *every* managed entity in the request, not just this import's, leaving the
        // caller holding stale objects.
        if ($dryRun) {
            $this->entityManager->beginTransaction();
        }

        try {
            return $this->runImport($data, $enrich, $dryRun, $result, $importSettings);
        } finally {
            if ($dryRun) {
                $this->entityManager->rollback();
                $this->entityManager->clear();
            }
        }
    }

    /**
     * @param bool                      $enrich         fetch professors and identical-course links from the OPO index
     * @param bool                      $dryRun         compute the changes but persist nothing
     * @param array<string, mixed>|null $importSettings import options to persist on the programme
     */
    private function runImport(
        ProgramData $data,
        bool $enrich,
        bool $dryRun,
        ImportResult $result,
        ?array $importSettings = null,
    ): ImportResult {
        // Enrichment lookup table: ECTS code => ['professors' => [...], 'identical' => [...]].
        $enrichment = $enrich ? $this->fetchEnrichment($data->allCourseCodes()) : [];

        $program = $this->upsertProgram($data, $result, $importSettings);

        // Upsert every course once (courses are shared across modules), keyed by code.
        /** @var array<string, Course> $coursesByCode */
        $coursesByCode = [];
        foreach ($this->collectCourses($data->modules) as $courseData) {
            $code = $courseData->code;
            if (isset($coursesByCode[$code])) {
                continue;
            }
            $coursesByCode[$code] = $this->upsertCourse($courseData, $enrichment[$code] ?? null, $result);
        }

        $this->syncIdenticalCourses($coursesByCode, $enrichment, $result);

        // Build the module tree and attach courses.
        foreach ($data->modules as $index => $moduleData) {
            $this->upsertModule($moduleData, $program, null, $coursesByCode, $result, ($index + 1) * 10);
        }

        $this->pruneStaleModules($data, $program, $result);
        $this->reportRemovedCourses($data, $coursesByCode, $result);

        // Flush in both cases: on a dry run the surrounding transaction is rolled back, so the
        // writes are computed (and any constraint violation surfaces) without being kept.
        $this->entityManager->flush();

        return $result;
    }

    /**
     * @param array<string, mixed>|null $importSettings
     */
    private function upsertProgram(
        ProgramData $data,
        ImportResult $result,
        ?array $importSettings = null,
    ): Program {
        $program = $this->programRepository->findOneByKulId($data->kulId);
        $isNew = !$program instanceof Program;
        if ($isNew) {
            $program = new Program();
            $program->setKulId($data->kulId);
            $program->setName($data->name);
            $result->programCreated = true;
        } elseif (
            $importSettings !== null
            && isset($importSettings['lang'])
            && $importSettings['lang'] !== $program->getLanguage()
        ) {
            // Preserve admin-customized programme names (e.g. "Bachelor: Burgie") on routine
            // re-syncs; only refresh the title from KU Leuven when the import language changes.
            $program->setName($data->name);
        }
        if ($importSettings !== null) {
            $program->setImportSettings($importSettings);
        }
        $this->entityManager->persist($program);

        return $program;
    }

    /**
     * @param array<string, Course> $coursesByCode
     * @param int                   $position sibling order from the KU Leuven tree, spaced by 10
     */
    private function upsertModule(
        ModuleData $data,
        Program $program,
        ?Module $parent,
        array $coursesByCode,
        ImportResult $result,
        int $position,
    ): void {
        $module = $this->moduleRepository->findOneByKulId($data->kulId);
        if (!$module instanceof Module) {
            $module = new Module();
            $module->setKulId($data->kulId);
            $result->modulesCreated++;
        } else {
            $result->modulesUpdated++;
        }
        $module->setName($data->name);
        $module->setIsElective($data->isElective);

        // KU Leuven orders module groups meaningfully (curriculum order, not alphabetical), so carry
        // that order over as the sibling position. Only write it while the module still sits at the
        // default 0: the tree editor normalises a whole sibling set to (i + 1) * 10 when an admin
        // reorders it, so any non-zero position means someone arranged this module by hand and a
        // re-import must not undo that.
        if ($module->getPosition() === 0) {
            $module->setPosition($position);
        }

        if ($parent === null) {
            // Top-level module: belongs directly to the program.
            $program->addModule($module);
        } else {
            // Nested module: reachable through its parent; program stays unset so Program::getModules
            // returns only the top level and the tree is walked via Module::getModules.
            $parent->addModule($module);

            // A module that was top-level in an earlier import still carries its program FK, and
            // nothing else ever clears it. Changing a structural option (flatten/semester/merge)
            // can demote a former root to a child, after which Program::getModules() would keep
            // listing it at the top level while it also renders under its new parent. Detach it so
            // the module appears exactly once.
            $previousProgram = $module->getProgram();
            if ($previousProgram !== null) {
                $previousProgram->removeModule($module);
            }
        }
        $this->entityManager->persist($module);

        // The KU Leuven mandatory flag sits on each course entry but never varies within a group,
        // so it is stored once on the module. A module with no courses of its own keeps the default.
        $mandatory = null;
        /** @var array<string, true> $expectedCodes */
        $expectedCodes = [];
        foreach ($data->courses as $courseData) {
            $expectedCodes[$courseData->code] = true;
            $course = $coursesByCode[$courseData->code] ?? null;
            if ($course instanceof Course) {
                $module->addCourse($course);
                $result->courseLinks++;
            }
            // Should the API ever disagree within one group, the compulsory reading wins: showing a
            // course as required when it is optional is the safer of the two errors for a student.
            $mandatory = ($mandatory ?? false) || $courseData->mandatory;
        }
        // Unlink courses that are still part of this programme's incoming tree (e.g. moved into
        // Semester child folders when structural options changed) so they do not render in both the
        // parent and child module. Courses dropped by KU Leuven altogether are kept and warned about.
        foreach ($module->getCourses()->toArray() as $existingCourse) {
            $existingCode = $existingCourse->getCode();
            if (isset($coursesByCode[$existingCode]) && !isset($expectedCodes[$existingCode])) {
                $module->removeCourse($existingCourse);
            }
        }
        if ($mandatory !== null) {
            $module->setCoursesMandatory($mandatory);
        }

        foreach ($data->children as $index => $child) {
            $this->upsertModule($child, $program, $module, $coursesByCode, $result, ($index + 1) * 10);
        }
    }

    /**
     * @param array{professors: list<string>, identical: list<string>}|null $enrichment
     */
    private function upsertCourse(CourseData $data, ?array $enrichment, ImportResult $result): Course
    {
        $course = $this->courseRepository->findOneBy(['code' => $data->code]);
        $isNew = !$course instanceof Course;
        if ($isNew) {
            $course = new Course();
            $course->setCode($data->code);
            $result->coursesCreated++;
        } else {
            $result->coursesUpdated++;
        }

        // Every field below is admin-editable, and the import overwrites it unconditionally. Record
        // what actually changes on an existing course so the preview can show it before anything is
        // committed — a hand-edited name or credit value shows up here as a pending overwrite.
        if (!$isNew) {
            $this->recordChange($result, $course, 'name', $course->getName(), $data->name);
            $this->recordChange($result, $course, 'nameNl', $course->getNameNl(), $data->nameNl);
            $this->recordChange($result, $course, 'nameEn', $course->getNameEn(), $data->nameEn);
            $this->recordChange($result, $course, 'language', $course->getLanguage(), $data->language);
            $this->recordChange($result, $course, 'credits', $course->getCredits(), $data->credits);
            $this->recordChange($result, $course, 'semesters', $course->getSemesters(), $data->semesters);
            if ($enrichment !== null) {
                $this->recordChange(
                    $result,
                    $course,
                    'professors',
                    $course->getProfessors(),
                    $enrichment['professors']
                );
            }
        }

        $course->setName($data->name);
        // Only overwrite a stored translation when KU Leuven actually published one. A programme
        // that ships titles in a single language must not wipe the other language's title that an
        // earlier import of a different programme already recorded for this shared course.
        if ($data->nameNl !== null) {
            $course->setNameNl($data->nameNl);
        }
        if ($data->nameEn !== null) {
            $course->setNameEn($data->nameEn);
        }
        $course->setLanguage($data->language);
        $course->setCredits($data->credits);
        $course->setSemesters($data->semesters);

        // A null $enrichment means the OPO index had nothing for this code (or enrichment was
        // switched off), so the stored professors are all we know and must be left alone. When the
        // document *was* found it is authoritative — including when it lists nobody, otherwise a
        // course whose teaching staff was removed upstream would keep the old names forever.
        if ($enrichment !== null) {
            $course->setProfessors($enrichment['professors']);
            if ($enrichment['professors'] !== []) {
                $result->enrichedCourses++;
            }
        }

        $this->entityManager->persist($course);

        return $course;
    }

    /**
     * Add identical-course links discovered in the OPO index without deleting existing links.
     *
     * Manually curated equivalents (including cross-programme or historical code pairs not active
     * in OPO's `moduleIdenticalModuleSet`) share the `course_identical_courses` table with no
     * source marker. Removing links absent from OPO would wipe those curations on Quick Sync, so
     * unmatched stored pairs between courses in this import are left intact and reported as
     * warnings for an admin to review if desired.
     *
     * @param array<string, Course>                                                 $coursesByCode
     * @param array<string, array{professors: list<string>, identical: list<string>}> $enrichment
     */
    private function syncIdenticalCourses(array $coursesByCode, array $enrichment, ImportResult $result): void
    {
        /** @var array<string, string> $before code => comma-joined identical codes */
        $before = [];
        foreach ($coursesByCode as $code => $course) {
            $before[$code] = implode(', ', $this->identicalCodes($course));
        }

        /** @var array<string, true> $desiredPairs */
        $desiredPairs = [];
        foreach ($coursesByCode as $code => $course) {
            foreach ($enrichment[$code]['identical'] ?? [] as $identicalCode) {
                $identical = $coursesByCode[$identicalCode]
                    ?? $this->courseRepository->findOneBy(['code' => $identicalCode]);
                if ($identical instanceof Course && $identical !== $course) {
                    $course->addIdenticalCourse($identical);
                    $desiredPairs[$this->pairKey($code, $identicalCode)] = true;
                }
            }
        }

        /** @var array<string, true> $warnedUnmatchedPairs */
        $warnedUnmatchedPairs = [];
        foreach ($coursesByCode as $code => $course) {
            if (!isset($enrichment[$code])) {
                // No authoritative answer for this course: never warn about missing OPO links.
                continue;
            }
            foreach ($course->getIdenticalCourses()->toArray() as $linked) {
                $linkedCode = $linked->getCode();
                if (!isset($coursesByCode[$linkedCode], $enrichment[$linkedCode])) {
                    continue;
                }
                $pairKey = $this->pairKey($code, $linkedCode);
                if (isset($desiredPairs[$pairKey]) || isset($warnedUnmatchedPairs[$pairKey])) {
                    continue;
                }
                $warnedUnmatchedPairs[$pairKey] = true;
                [$firstCode, $secondCode] = $code < $linkedCode ? [$code, $linkedCode] : [$linkedCode, $code];
                $result->addWarning(
                    sprintf(
                        'Identical-course link %s <-> %s is not in the KU Leuven OPO index; left in place.',
                        $firstCode,
                        $secondCode,
                    )
                );
            }
        }

        foreach ($coursesByCode as $code => $course) {
            $after = implode(', ', $this->identicalCodes($course));
            if ($after !== $before[$code]) {
                $result->addCourseChange(
                    $code,
                    $course->getName(),
                    'identicalCourses',
                    $before[$code] === '' ? '—' : $before[$code],
                    $after === '' ? '—' : $after,
                );
            }
        }
    }

    /**
     * @return list<string> sorted, so the comparison ignores collection order
     */
    private function identicalCodes(Course $course): array
    {
        $codes = array_map(static fn (Course $c): string => $c->getCode(), $course->getIdenticalCourses()->toArray());
        sort($codes);

        return $codes;
    }

    /**
     * Order-independent key for a pair of course codes.
     */
    private function pairKey(string $a, string $b): string
    {
        return $a < $b ? $a . '|' . $b : $b . '|' . $a;
    }

    /**
     * Report courses that are still attached to this programme's import-managed modules but no
     * longer appear anywhere in the incoming tree — KU Leuven dropped them from the programme.
     *
     * They are only reported, never unlinked: a course carries user comments and documents, and
     * deciding what to do with a course that left the curriculum is an admin's call, not the
     * importer's. This is the reporting half the class docblock has always claimed.
     *
     * @param array<string, Course> $coursesByCode courses present in the incoming tree
     */
    private function reportRemovedCourses(ProgramData $data, array $coursesByCode, ImportResult $result): void
    {
        $incoming = [];
        foreach (array_keys($coursesByCode) as $code) {
            $incoming[$code] = true;
        }

        /** @var array<string, string> $stale code => "module name" */
        $stale = [];
        foreach ($this->collectModuleKulIds($data->modules) as $kulId) {
            $module = $this->moduleRepository->findOneByKulId($kulId);
            if (!$module instanceof Module) {
                continue;
            }
            foreach ($module->getCourses() as $course) {
                $code = $course->getCode();
                if (!isset($incoming[$code]) && !isset($stale[$code])) {
                    $stale[$code] = $module->getName();
                }
            }
        }

        foreach ($stale as $code => $moduleName) {
            $result->addWarning(
                sprintf(
                    'Course %s is still linked to "%s" but is no longer in the KU Leuven programme; left in place.',
                    $code,
                    $moduleName,
                )
            );
        }
    }

    /**
     * Detach modules that the programme's stored tree still holds but the incoming tree no longer
     * produces. Without this the importer only ever adds: changing a structural option leaves the
     * previous shape attached next to the new one, so "Common Compulsory Courses" ends up holding
     * both its four named groups *and* the four Semester folders built from those same courses —
     * every course rendered twice, the two sets interleaved because both were numbered 10..40.
     *
     * Detach, not delete. An orphaned module keeps its hand-set position and its course links, so
     * switching an option back re-adopts it exactly as it was (upsertModule finds it by kulId).
     * Deleting would also mean deciding what happens to the users who favourited it.
     *
     * Three rules keep this from touching anything an admin owns:
     *  - modules without a kulId were created by hand; they are never detached and never descended
     *    into, so a manual folder can hold whatever an admin put in it;
     *  - descent only continues through modules the incoming tree also contains, so a subtree an
     *    admin re-parented under something manual is out of reach;
     *  - a stale module is detached but not descended into, leaving its own children hanging off it
     *    ready for re-adoption rather than shredding the subtree.
     */
    private function pruneStaleModules(ProgramData $data, Program $program, ImportResult $result): void
    {
        /** @var array<string, true> $allIncoming */
        $allIncoming = [];
        foreach ($this->collectModuleKulIds($data->modules) as $kulId) {
            $allIncoming[$kulId] = true;
        }
        $expectedChildren = $this->collectExpectedChildren($data->modules);

        // $modules is a self-referencing ManyToMany, so nothing in the schema forbids a cycle.
        /** @var array<int, true> $visited */
        $visited = [];
        $this->pruneChildren(
            $program->getModules()->toArray(),
            $expectedChildren,
            $allIncoming,
            $visited,
            $result,
            $program,
            null,
        );
    }

    /**
     * @param list<Module>                       $children
     * @param array<string, array<string, true>> $expectedChildren parent kulId (or '__ROOT__') => expected child kulIds
     * @param array<string, true>                $allIncoming      every kulId present anywhere in the incoming tree
     * @param array<int, true>                   $visited          module ids already walked
     */
    private function pruneChildren(
        array $children,
        array $expectedChildren,
        array $allIncoming,
        array &$visited,
        ImportResult $result,
        Program $program,
        ?Module $parent,
    ): void {
        $parentKey = $parent === null ? '__ROOT__' : (string) $parent->getKulId();
        foreach ($children as $child) {
            $kulId = $child->getKulId();
            if ($kulId === null) {
                continue;
            }

            if (!isset($expectedChildren[$parentKey][$kulId])) {
                if ($parent === null) {
                    $program->removeModule($child);
                } else {
                    $parent->removeModule($child);
                }
                $result->modulesDetached++;
                $stillInProgram = isset($allIncoming[$kulId]);
                $result->addWarning($this->describeDetachment($child, $parent, $result->dryRun, $stillInProgram));

                continue;
            }

            $id = $child->getId();
            if ($id !== null && isset($visited[$id])) {
                continue;
            }
            if ($id !== null) {
                $visited[$id] = true;
            }

            $this->pruneChildren(
                $child->getModules()->toArray(),
                $expectedChildren,
                $allIncoming,
                $visited,
                $result,
                $program,
                $child,
            );
        }
    }

    /**
     * Why a module was detached, in the admin's terms rather than the importer's.
     *
     * A "Semester 3" or "Keuzepakketten" folder only ever existed because of the structural options
     * chosen for the import, so it vanishing means those options changed — saying KU Leuven dropped
     * it would send an admin looking for a curriculum change that never happened. A real module
     * group disappearing is the opposite: nothing changed here, the source did. And a module still
     * present elsewhere in the incoming tree was re-parented (e.g. un-flattening or undoing a
     * manual move).
     */
    private function describeDetachment(
        Module $module,
        ?Module $parent,
        bool $dryRun,
        bool $stillInProgram = false,
    ): string {
        if ($stillInProgram) {
            return sprintf(
                'Module "%s" moved elsewhere in the programme structure, so it is %s %s.',
                $module->getName(),
                $dryRun ? 'about to be detached from' : 'detached from',
                $parent === null ? 'the programme' : sprintf('"%s"', $parent->getName()),
            );
        }

        $synthetic = false;
        foreach (ProgramTreeMapper::SYNTHETIC_KULID_PREFIXES as $prefix) {
            if (str_starts_with((string) $module->getKulId(), $prefix)) {
                $synthetic = true;
                break;
            }
        }

        return sprintf(
            '%s "%s" %s %s %s; its courses and position are kept in case the structure changes back.',
            $synthetic ? 'Folder' : 'Module',
            $module->getName(),
            $synthetic
                ? 'was built by structure options this import no longer uses, so it is'
                : 'is no longer in the KU Leuven programme, so it is',
            $dryRun ? 'about to be detached from' : 'detached from',
            $parent === null ? 'the programme' : sprintf('"%s"', $parent->getName()),
        );
    }

    /**
     * @param list<ModuleData> $modules
     *
     * @return array<string, array<string, true>>
     */
    private function collectExpectedChildren(array $modules): array
    {
        /** @var array<string, array<string, true>> $expected */
        $expected = ['__ROOT__' => []];
        $walk = static function (array $children, string $parentKey) use (&$walk, &$expected): void {
            foreach ($children as $child) {
                $expected[$parentKey][$child->kulId] = true;
                $expected[$child->kulId] ??= [];
                $walk($child->children, $child->kulId);
            }
        };
        $walk($modules, '__ROOT__');

        return $expected;
    }

    /**
     * @param list<ModuleData> $modules
     *
     * @return list<string>
     */
    private function collectModuleKulIds(array $modules): array
    {
        $ids = [];
        foreach ($modules as $module) {
            $ids[] = $module->kulId;
            foreach ($this->collectModuleKulIds($module->children) as $childId) {
                $ids[] = $childId;
            }
        }

        return $ids;
    }

    /**
     * Note a field the import is about to overwrite on an existing course, unless the value is
     * already identical. Arrays are compared order-insensitively so a reshuffled professor list
     * does not read as a change.
     *
     * @param list<string>|string|int|null $old
     * @param list<string>|string|int|null $new
     */
    private function recordChange(
        ImportResult $result,
        Course $course,
        string $field,
        array|string|int|null $old,
        array|string|int|null $new,
    ): void {
        if (is_array($old) && is_array($new)) {
            $a = $old;
            $b = $new;
            sort($a);
            sort($b);
            if ($a === $b) {
                return;
            }
        } elseif ($old === $new) {
            return;
        }

        $result->addCourseChange(
            $course->getCode(),
            $course->getName(),
            $field,
            $this->display($old),
            $this->display($new),
        );
    }

    /**
     * @param list<string>|string|int|null $value
     */
    private function display(array|string|int|null $value): string
    {
        if (is_array($value)) {
            return $value === [] ? '—' : implode(', ', $value);
        }

        return $value === null || $value === '' ? '—' : (string) $value;
    }

    /**
     * Fetch professors and identical-course codes for the given codes from the OPO index.
     *
     * @param list<string> $codes
     *
     * @return array<string, array{professors: list<string>, identical: list<string>}>
     */
    private function fetchEnrichment(array $codes): array
    {
        $enrichment = [];
        foreach ($this->client->fetchOpoByCodes($codes) as $code => $source) {
            $enrichment[$code] = [
                'professors' => $this->extractProfessors($source),
                'identical' => $this->extractIdenticalCodes($source),
            ];
        }

        return $enrichment;
    }

    /**
     * Extract professor KU Leuven u-numbers (e.g. "u0179816") from an OPO document source.
     *
     * The module-level `moduleInstructorSet` only carries the course coordinator. The other
     * teachers (co-lecturers, tutors) that the KU Leuven website also lists live in the per-activity
     * `activitySet[].activityInstructorSet[]`, so we merge both sets — otherwise most courses would
     * import a single professor even when several teach them. The coordinator is kept first;
     * remaining teachers follow in activity order, de-duplicated.
     *
     * @param array<string, mixed> $source
     *
     * @return list<string>
     */
    private function extractProfessors(array $source): array
    {
        /** @var list<array<string, mixed>> $instructorSets */
        $instructorSets = [$source['moduleInstructorSet'] ?? []];
        foreach ($source['activitySet'] ?? [] as $activity) {
            $instructorSets[] = $activity['activityInstructorSet'] ?? [];
        }

        $uNumbers = [];
        foreach ($instructorSets as $instructors) {
            foreach ($instructors as $instructor) {
                $uNumber = $this->instructorUNumber($instructor);
                if ($uNumber !== null && !in_array($uNumber, $uNumbers, true)) {
                    $uNumbers[] = $uNumber;
                }
            }
        }

        return $uNumbers;
    }

    /**
     * Resolve a single instructor record to a KU Leuven u-number, or null when it is unusable.
     *
     * KU Leuven pads instructor lists with an all-nines sentinel (objectIdCentralPerson "99999999",
     * family name "N") for anonymous/placeholder teachers; importing it would yield a bogus
     * "u99999999", so any all-nines identifier is rejected.
     *
     * @param array<string, mixed> $instructor
     */
    private function instructorUNumber(array $instructor): ?string
    {
        $uNumber = null;
        if (!empty($instructor['uid'])) {
            $uNumber = strtolower(trim((string) $instructor['uid']));
        } elseif (!empty($instructor['masterEmployeeNr'])) {
            $uNumber = 'u' . str_pad(trim((string) $instructor['masterEmployeeNr']), 7, '0', STR_PAD_LEFT);
        } elseif (!empty($instructor['objectIdCentralPerson'])) {
            $uNumber = 'u' . str_pad(trim((string) $instructor['objectIdCentralPerson']), 7, '0', STR_PAD_LEFT);
        }

        if ($uNumber === null || $uNumber === '' || preg_match('/^u9+$/', $uNumber) === 1) {
            return null;
        }

        return $uNumber;
    }

    /**
     * @param array<string, mixed> $source
     *
     * @return list<string>
     */
    private function extractIdenticalCodes(array $source): array
    {
        $codes = [];
        foreach ($source['moduleLanguageSet'] ?? [] as $lang) {
            foreach ($lang['moduleIdenticalModuleSet'] ?? [] as $identical) {
                if (!filter_var($identical['isActive'] ?? false, FILTER_VALIDATE_BOOL)) {
                    continue;
                }
                $code = strtoupper(trim((string) ($identical['ectsCode'] ?? '')));
                if ($code !== '' && !in_array($code, $codes, true)) {
                    $codes[] = $code;
                }
            }
        }

        return $codes;
    }

    /**
     * Flatten every course in the tree (with duplicates; caller de-duplicates by code).
     *
     * @param list<ModuleData> $modules
     *
     * @return list<CourseData>
     */
    private function collectCourses(array $modules): array
    {
        $courses = [];
        foreach ($modules as $module) {
            foreach ($module->courses as $course) {
                $courses[] = $course;
            }
            foreach ($this->collectCourses($module->children) as $course) {
                $courses[] = $course;
            }
        }

        return $courses;
    }
}
