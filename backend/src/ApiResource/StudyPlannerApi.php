<?php

namespace App\ApiResource;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\Post;
use App\Constants\SerializationGroups;
use App\State\StudyPlannerProcessor;
use App\State\StudyPlannerProvider;
use Symfony\Component\Serializer\Attribute\Groups;

/**
 * The logged-in user's study planner: their KU Leuven timetable with what they marked in it, the
 * deadlines they entered, and the link of the calendar it exports. Always the caller's own; there
 * is no way to read someone else's.
 *
 * - GET /api/study_planner: the planner (syncs the timetable first when it is over an hour old).
 *   Without a subscription, `subscribed` is false and the lists are empty.
 * - POST /api/study_planner/subscription {"icsUrl"}: subscribe, or change the link. A different
 *   link starts a fresh timetable; marks on sessions go, weekly rules and deadlines stay.
 * - DELETE /api/study_planner: unsubscribe and forget everything.
 * - POST /api/study_planner/sync: sync now.
 * - POST /api/study_planner/operations: one change, see StudyPlannerOperationInput.
 * - POST /api/study_planner/feed_token: a new secret in the export link; the old link stops working.
 * - GET /api/study_planner/vtk_events: what is coming up at VTK, to put in the planner
 *   (StudyPlannerVtkEventsController).
 *
 * Every POST answers with the whole planner. The exported calendar itself is
 * GET /api/study_planner/feed/{token}.ics (StudyPlannerFeedController), without login.
 */
#[ApiResource(
    shortName: 'StudyPlanner',
    operations: [
        new Get(
            uriTemplate: '/study_planner',
            provider: StudyPlannerProvider::class,
        ),
        new Post(
            uriTemplate: '/study_planner/subscription',
            status: 200,
            input: StudyPlannerSubscriptionInput::class,
            read: false,
            processor: StudyPlannerProcessor::class,
            name: StudyPlannerProcessor::SUBSCRIBE,
        ),
        new Delete(
            uriTemplate: '/study_planner',
            read: false,
            processor: StudyPlannerProcessor::class,
            name: StudyPlannerProcessor::UNSUBSCRIBE,
        ),
        new Post(
            uriTemplate: '/study_planner/sync',
            status: 200,
            input: false,
            read: false,
            deserialize: false,
            processor: StudyPlannerProcessor::class,
            name: StudyPlannerProcessor::SYNC,
        ),
        new Post(
            uriTemplate: '/study_planner/operations',
            status: 200,
            input: StudyPlannerOperationInput::class,
            read: false,
            processor: StudyPlannerProcessor::class,
            name: StudyPlannerProcessor::OPERATION,
        ),
        new Post(
            uriTemplate: '/study_planner/feed_token',
            status: 200,
            input: false,
            read: false,
            deserialize: false,
            processor: StudyPlannerProcessor::class,
            name: StudyPlannerProcessor::ROTATE_FEED,
        ),
    ],
    normalizationContext: ['groups' => [SerializationGroups::STUDY_PLANNER_GET]],
)]
class StudyPlannerApi
{
    #[Groups([SerializationGroups::STUDY_PLANNER_GET])]
    public bool $subscribed = false;

    /** The subscription link, as stored (https). */
    #[Groups([SerializationGroups::STUDY_PLANNER_GET])]
    public ?string $icsUrl = null;

    /** Path of the exported calendar on this server, e.g. "/api/study_planner/feed/3f…9a.ics". */
    #[Groups([SerializationGroups::STUDY_PLANNER_GET])]
    public ?string $feedPath = null;

    /** ISO 8601, or null before the first successful sync. */
    #[Groups([SerializationGroups::STUDY_PLANNER_GET])]
    public ?string $lastSync = null;

    /** Why the last sync failed; null when it worked. */
    #[Groups([SerializationGroups::STUDY_PLANNER_GET])]
    public ?string $syncError = null;

    /** Today in Leuven, "YYYY-MM-DD". */
    #[Groups([SerializationGroups::STUDY_PLANNER_GET])]
    public string $today = '';

    /** Minutes since midnight in Leuven. */
    #[Groups([SerializationGroups::STUDY_PLANNER_GET])]
    public int $now = 0;

    /**
     * The courses of the timetable. `key` is "course:{id}" for a timetable course matched to a
     * Burgieclan course (by code, else by name), "name:{name}" otherwise.
     *
     * @var list<array{key: string, label: string, courseId: ?int, courseCode: ?string, nameNl: ?string, nameEn: ?string}>
     */
    #[Groups([SerializationGroups::STUDY_PLANNER_GET])]
    public array $subjects = [];

    /**
     * The sessions, sorted, in Leuven wall-clock time, without those KU Leuven took out.
     * `hidden`/`mandatory` are "event" (this session), "rule" (a weekly rule) or null.
     *
     * @var list<array<string, mixed>>
     */
    #[Groups([SerializationGroups::STUDY_PLANNER_GET])]
    public array $events = [];

    /**
     * Deadlines and mandatory sessions entered by hand, sorted by date and time.
     *
     * @var list<array<string, mixed>>
     */
    #[Groups([SerializationGroups::STUDY_PLANNER_GET])]
    public array $items = [];

    /**
     * @var list<array{id: string, action: string, course: string, weekday: int, time: string, location: string}>
     */
    #[Groups([SerializationGroups::STUDY_PLANNER_GET])]
    public array $rules = [];

    /**
     * The VTK events put in the planner (StudyPlannerVtkEvent), sorted by their first
     * occurrence. `occurrences` holds one entry per moment of a series, else just one, in Leuven
     * wall-clock time: `date`/`endDate` "YYYY-MM-DD", `start`/`end` "HH:MM" (null all day),
     * `startMin`/`endMin` minutes on `date` (an evening running past midnight ends at 1440).
     *
     * @var list<array<string, mixed>>
     */
    #[Groups([SerializationGroups::STUDY_PLANNER_GET])]
    public array $vtkEvents = [];
}
