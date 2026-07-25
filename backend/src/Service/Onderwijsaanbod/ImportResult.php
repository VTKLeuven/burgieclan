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
    public int $coursesCreated = 0;
    public int $coursesUpdated = 0;
    public int $courseLinks = 0;
    public int $enrichedCourses = 0;

    /** @var list<string> */
    public array $warnings = [];

    public function addWarning(string $message): void
    {
        $this->warnings[] = $message;
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
            'coursesCreated' => $this->coursesCreated,
            'coursesUpdated' => $this->coursesUpdated,
            'courseLinks' => $this->courseLinks,
            'enrichedCourses' => $this->enrichedCourses,
        ];
    }
}
