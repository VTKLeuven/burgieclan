<?php

namespace App\ApiResource;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\OpenApi\Model\Operation;
use ApiPlatform\OpenApi\Model\Parameter;
use App\Controller\Api\GetCourseRatingSummaryController;

/**
 * Every rated section's score for one course, in a single response.
 *
 * Deliberately not shaped like VoteSummaryApi, which answers per item: a course page draws all
 * of its rated axes at once, so an endpoint per axis would be a round trip each.
 *
 * Two scores rather than one, both with their sample size. A single recency-weighted average
 * would be one clean number nobody could explain, and these scores affect how professors are
 * seen - being able to say exactly how a number was reached is worth more than elegance.
 */
#[ApiResource(
    shortName: 'CourseRatingSummary',
    operations: [
        new Get(
            uriTemplate: '/courses/{id}/ratings',
            controller: GetCourseRatingSummaryController::class,
            read: false,
            openapi: new Operation(
                summary: 'Get every rated section\'s score for a course',
                parameters: [
                    new Parameter(
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: ['type' => 'integer'],
                        description: 'Course ID'
                    ),
                ]
            )
        ),
    ],
)]
class CourseRatingSummaryApi
{
    #[ApiProperty(readable: false, writable: false, identifier: true)]
    public ?int $id = null;

    /**
     * The academic years counted as "recent", newest first.
     *
     * Returned rather than assumed so the client can label the score with the window it
     * actually covers instead of hardcoding the same number in a second place.
     *
     * @var string[]
     */
    #[ApiProperty(description: 'The academic years the recent score covers, newest first')]
    public array $recentYears = [];

    /**
     * One entry per rated section, including sections nobody has rated yet.
     *
     * Empty sections are present on purpose: a course with no ratings still has to show the
     * stars, or there is nothing for the first person to click.
     *
     * Each entry is shaped:
     *   categoryId        int
     *   recent            {average: float|null, count: int}
     *   allTime           {average: float|null, count: int}
     *   byYear            list<{year: string, average: float, count: int}>
     *   currentUserRating int|null
     *
     * An average comes back null below the repository's threshold rather than as a thin number
     * the client is trusted to hide, so the rule lives in one place.
     *
     * @var array<int, array<string, mixed>>
     */
    #[ApiProperty(description: 'Recent and all-time score per rated comment section')]
    public array $sections = [];
}
