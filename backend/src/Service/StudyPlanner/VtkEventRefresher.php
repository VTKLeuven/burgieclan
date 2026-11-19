<?php

namespace App\Service\StudyPlanner;

use App\Entity\StudyPlanner;
use App\Entity\StudyPlannerVtkEvent;
use DateTimeImmutable;
use Doctrine\ORM\EntityManagerInterface;
use RuntimeException;

/**
 * Keeps the copies of the VTK events in a study planner up to date with the VTK website, so a
 * moved start time or a new room also moves in the planner and the exported calendar.
 *
 * Runs where the timetable sync runs (reading the planner, reading the exported calendar), at
 * most once per self::STALE_AFTER per event, and only for events that are not over yet: what
 * happened last month does not change any more. A failing VTK website changes nothing; the
 * copies stay as they were and are tried again next time.
 */
class VtkEventRefresher
{
    public const STALE_AFTER = '-1 hour';

    public function __construct(
        private readonly VtkEvents $vtkEvents,
        private readonly EntityManagerInterface $entityManager,
    ) {}

    public function refreshIfStale(StudyPlanner $planner, DateTimeImmutable $now = new DateTimeImmutable()): void
    {
        $limit = $now->modify(self::STALE_AFTER);
        $stale = array_values(
            array_filter(
                $planner->getVtkEvents()->toArray(),
                static fn (StudyPlannerVtkEvent $e): bool => $e->getRefreshedAt() <= $limit && $e->getEndsAt() >= $now->modify('-1 day')
            )
        );
        if ([] === $stale) {
            return;
        }

        try {
            $found = $this->vtkEvents->byIds(array_map(static fn (StudyPlannerVtkEvent $e): string => $e->getVtkEventId(), $stale));
        } catch (RuntimeException) {
            return;
        }

        foreach ($stale as $event) {
            $data = $found[$event->getVtkEventId()] ?? null;
            if (null === $data) {
                $event->markGone($now);
            } else {
                $event->update($data, $now);
            }
        }
        $this->entityManager->flush();
    }
}
