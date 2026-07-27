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
     * @param bool $enrich fetch professors and identical-course links from the OPO index
     * @param bool $dryRun compute the changes but persist nothing
     */
    public function import(ProgramData $data, bool $enrich = true, bool $dryRun = false): ImportResult
    {
        $result = new ImportResult();
        $result->dryRun = $dryRun;

        // Enrichment lookup table: ECTS code => ['professors' => [...], 'identical' => [...]].
        $enrichment = $enrich ? $this->fetchEnrichment($data->allCourseCodes()) : [];

        $program = $this->upsertProgram($data, $result);

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

        // Link identical courses now that all courses exist.
        foreach ($coursesByCode as $code => $course) {
            foreach ($enrichment[$code]['identical'] ?? [] as $identicalCode) {
                $identical = $coursesByCode[$identicalCode] ?? $this->courseRepository->findOneBy(['code' => $identicalCode]);
                if ($identical instanceof Course && $identical !== $course) {
                    $course->addIdenticalCourse($identical);
                }
            }
        }

        // Build the module tree and attach courses.
        foreach ($data->modules as $moduleData) {
            $this->upsertModule($moduleData, $program, null, $coursesByCode, $result);
        }

        if ($dryRun) {
            $this->entityManager->clear();
        } else {
            $this->entityManager->flush();
        }

        return $result;
    }

    private function upsertProgram(ProgramData $data, ImportResult $result): Program
    {
        $program = $this->programRepository->findOneByKulId($data->kulId);
        if (!$program instanceof Program) {
            $program = new Program();
            $program->setKulId($data->kulId);
            $result->programCreated = true;
        }
        $program->setName($data->name);
        $this->entityManager->persist($program);

        return $program;
    }

    /**
     * @param array<string, Course> $coursesByCode
     */
    private function upsertModule(
        ModuleData $data,
        Program $program,
        ?Module $parent,
        array $coursesByCode,
        ImportResult $result,
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

        if ($parent === null) {
            // Top-level module: belongs directly to the program.
            $program->addModule($module);
        } else {
            // Nested module: reachable through its parent; program stays unset so Program::getModules
            // returns only the top level and the tree is walked via Module::getModules.
            $parent->addModule($module);
        }
        $this->entityManager->persist($module);

        foreach ($data->courses as $courseData) {
            $course = $coursesByCode[$courseData->code] ?? null;
            if ($course instanceof Course) {
                $module->addCourse($course);
                $result->courseLinks++;
            }
        }

        foreach ($data->children as $child) {
            $this->upsertModule($child, $program, $module, $coursesByCode, $result);
        }
    }

    /**
     * @param array{professors: list<string>, identical: list<string>}|null $enrichment
     */
    private function upsertCourse(CourseData $data, ?array $enrichment, ImportResult $result): Course
    {
        $course = $this->courseRepository->findOneBy(['code' => $data->code]);
        if (!$course instanceof Course) {
            $course = new Course();
            $course->setCode($data->code);
            $result->coursesCreated++;
        } else {
            $result->coursesUpdated++;
        }

        $course->setName($data->name);
        $course->setLanguage($data->language);
        $course->setCredits($data->credits);
        $course->setSemesters($data->semesters);

        if ($enrichment !== null && $enrichment['professors'] !== []) {
            $course->setProfessors($enrichment['professors']);
            $result->enrichedCourses++;
        }

        $this->entityManager->persist($course);

        return $course;
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
