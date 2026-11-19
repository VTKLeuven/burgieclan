<?php

namespace App\Controller\Api;

use App\Entity\User;
use App\Repository\StudyPlannerRepository;
use App\Service\StudyPlanner\LeuvenTime;
use App\Service\StudyPlanner\VtkEvents;
use RuntimeException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * GET /api/study_planner/vtk_events: what is coming up at VTK, to put in the study planner with
 * {"op": "addVtkEvent"}. `inPlanner` says which ones the caller already added.
 *
 * Times come as ISO 8601 and as Leuven wall-clock date and time, like the rest of the planner.
 */
class StudyPlannerVtkEventsController extends AbstractController
{
    #[Route('/api/study_planner/vtk_events', name: 'api_study_planner_vtk_events', methods: ['GET'], priority: 10)]
    public function __invoke(VtkEvents $vtkEvents, StudyPlannerRepository $planners): JsonResponse
    {
        $user = $this->getUser();
        assert($user instanceof User);
        $planner = $planners->findForUser($user);
        $chosen = [];
        foreach ($planner?->getVtkEvents() ?? [] as $event) {
            if (null === $event->getGoneAt()) {
                $chosen[$event->getVtkEventId()] = true;
            }
        }

        try {
            $events = $vtkEvents->upcoming();
        } catch (RuntimeException $e) {
            return new JsonResponse(['detail' => $e->getMessage()], Response::HTTP_SERVICE_UNAVAILABLE);
        }

        return new JsonResponse(
            [
            'events' => array_map(
                static function (array $e) use ($chosen): array {
                    $start = LeuvenTime::wall($e['start']);
                    $end = LeuvenTime::wall($e['end']);

                    return [
                        'id' => $e['id'],
                        'titleNl' => $e['titleNl'],
                        'titleEn' => $e['titleEn'],
                        'location' => $e['location'],
                        'start' => $e['start']->format(DATE_ATOM),
                        'end' => $e['end']->format(DATE_ATOM),
                        'date' => $start['date'],
                        'time' => $e['allDay'] ? null : $start['time'],
                        'endDate' => $end['date'],
                        'allDay' => $e['allDay'],
                        'series' => count($e['moments']) > 0,
                        'urlNl' => $e['urlNl'],
                        'urlEn' => $e['urlEn'],
                        'inPlanner' => isset($chosen[$e['id']]),
                    ];
                },
                $events
            ),
            ]
        );
    }
}
