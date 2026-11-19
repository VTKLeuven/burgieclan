<?php

namespace App\Controller\Api;

use App\Repository\StudyPlannerRepository;
use App\Service\StudyPlanner\StudyPlannerIcsExport;
use App\Service\StudyPlanner\StudyPlannerSync;
use App\Service\StudyPlanner\VtkEventRefresher;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Attribute\Route;

/**
 * The calendar a study planner exports (StudyPlannerIcsExport), for a calendar app to subscribe
 * to. Calendar apps cannot log in, so the long random token in the link is the only key; it is
 * public in security.yaml. A stale timetable is synced first, so the calendar keeps up even when
 * its owner never opens Burgieclan.
 */
class StudyPlannerFeedController extends AbstractController
{
    #[Route(
        '/api/study_planner/feed/{token}.ics',
        name: 'api_study_planner_feed',
        requirements: ['token' => '[a-f0-9]{48}'],
        methods: ['GET', 'HEAD'],
        priority: 10,
    )]
    public function __invoke(
        string $token,
        StudyPlannerRepository $planners,
        StudyPlannerSync $sync,
        StudyPlannerIcsExport $export,
        VtkEventRefresher $vtkRefresher,
    ): Response {
        $planner = $planners->findByFeedToken($token) ?? throw new NotFoundHttpException();
        $sync->syncIfStale($planner);
        $vtkRefresher->refreshIfStale($planner);

        return new Response(
            $export->build($planner),
            Response::HTTP_OK,
            [
            'Content-Type' => 'text/calendar; charset=utf-8',
            'Content-Disposition' => 'inline; filename="timetable.ics"',
            'Cache-Control' => 'no-store',
            'X-Robots-Tag' => 'noindex, nofollow',
            ]
        );
    }
}
