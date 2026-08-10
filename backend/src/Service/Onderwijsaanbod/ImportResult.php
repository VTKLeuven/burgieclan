<?php

namespace App\Service\Onderwijsaanbod;

/**
 * Mutable tally of what an import did (or, in dry-run, would do). Returned to the caller so the
 * console command and admin wizard can present a summary without re-inspecting the database.
 */
class ImportResult
{
    public bool $dryRun = false;
    public bool $programCreated = false;
    public int $modulesCreated = 0;
    public int $modulesUpdated = 0;
    public int $modulesDetached = 0;
    public int $coursesCreated = 0;
    public int $coursesUpdated = 0;
    public int $courseLinks = 0;
    public int $enrichedCourses = 0;

    /** @var list<string> */
    public array $warnings = [];

    /**
     * Fields the import would overwrite on courses that already exist, so the preview can show what
     * a sync is about to replace. Every field listed here is also editable in the admin, so an entry
     * may well be a hand-made change about to be lost.
     *
     * @var list<array{code: string, course: string, field: string, from: string, to: string}>
     */
    public array $courseChanges = [];

    public function addWarning(string $message): void
    {
        $this->warnings[] = $message;
    }

    public function addCourseChange(string $code, string $course, string $field, string $from, string $to): void
    {
        $this->courseChanges[] = [
            'code' => $code,
            'course' => $course,
            'field' => $field,
            'from' => $from,
            'to' => $to,
        ];
    }

    /**
     * @return array<string, int|bool>
     */
    public function toArray(): array
    {
        return [
            'dryRun' => $this->dryRun,
            'programCreated' => $this->programCreated,
            'modulesCreated' => $this->modulesCreated,
            'modulesUpdated' => $this->modulesUpdated,
            'modulesDetached' => $this->modulesDetached,
            'coursesCreated' => $this->coursesCreated,
            'coursesUpdated' => $this->coursesUpdated,
            'courseLinks' => $this->courseLinks,
            'enrichedCourses' => $this->enrichedCourses,
        ];
    }
}
