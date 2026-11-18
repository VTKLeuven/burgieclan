<?php

namespace App\ApiResource;

use App\Service\StudyPlanner\TimetableUrl;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * Body of POST /api/study_planner/subscription. The link is checked further by TimetableUrl.
 */
class StudyPlannerSubscriptionInput
{
    /** The KU Leuven timetable's subscription link (webcal:// or https://cloud.timeedit.net/…). */
    #[Assert\NotBlank]
    #[Assert\Length(max: TimetableUrl::MAX_LENGTH)]
    public ?string $icsUrl = null;
}
