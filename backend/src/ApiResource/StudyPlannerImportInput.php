<?php

namespace App\ApiResource;

use App\Service\StudyPlanner\StudyPlannerIcsImport;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * Body of POST /api/study_planner/import: the text of a calendar file (.ics) with past sessions.
 * See StudyPlannerIcsImport for what is taken from it.
 */
class StudyPlannerImportInput
{
    #[Assert\NotBlank]
    #[Assert\Length(max: StudyPlannerIcsImport::MAX_BYTES)]
    public ?string $ics = null;
}
