<?php

namespace App\Service\StudyPlanner;

use App\ApiResource\StudyPlannerApi;
use App\Entity\StudyPlanner;
use App\Entity\StudyPlannerEvent;
use App\Entity\StudyPlannerItem;
use App\Entity\StudyPlannerRule;
use DateTimeImmutable;
use DateTimeInterface;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;

/**
 * Puts a study planner together the way it is shown: every session in Leuven time with its
 * subject and marks (its own, or from a weekly rule), the deadlines, and the rules. Shared by the
 * API (StudyPlannerProvider) and the exported calendar (StudyPlannerIcsExport).
 */
class StudyPlannerState
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly StudyPlannerSubjects $subjects,
        private readonly UrlGeneratorInterface $urlGenerator,
    ) {}

    /** The first line of a location; some sessions list two rooms on separate lines. */
    public static function room(?string $location): string
    {
        return trim(explode("\n", (string) $location)[0]);
    }

    /**
     * The sessions KU Leuven still has in its timetable, sorted by start.
     *
     * @return list<StudyPlannerEvent>
     */
    public function activeEvents(StudyPlanner $planner): array
    {
        /** @var list<StudyPlannerEvent> $events */
        $events = $this->entityManager->createQueryBuilder()
            ->select('e')
            ->from(StudyPlannerEvent::class, 'e')
            ->where('e.planner = :planner')
            ->andWhere('e.removedAt IS NULL')
            ->orderBy('e.startsAt', 'ASC')
            ->addOrderBy('e.uid', 'ASC')
            ->setParameter('planner', $planner)
            ->getQuery()
            ->getResult();

        return $events;
    }

    public function build(?StudyPlanner $planner): StudyPlannerApi
    {
        $api = new StudyPlannerApi();
        $now = LeuvenTime::wall(new DateTimeImmutable());
        $api->today = $now['date'];
        $api->now = $now['minutes'];
        if (null === $planner) {
            return $api;
        }

        $api->subscribed = true;
        $api->icsUrl = $planner->getIcsUrl();
        $api->feedPath = $this->urlGenerator->generate('api_study_planner_feed', ['token' => $planner->getFeedToken()]);
        $api->lastSync = $planner->getLastSync()?->format(DateTimeInterface::ATOM);
        $api->syncError = $planner->getSyncError();

        $events = $this->activeEvents($planner);
        $resolved = $this->subjects->resolve($events);
        $api->subjects = $resolved['subjects'];
        $rules = $planner->getRules()->toArray();

        foreach ($events as $event) {
            $api->events[] = $this->event($event, $rules, $resolved['of'][$event->getUid()]);
        }

        $items = $planner->getItems()->toArray();
        usort(
            $items,
            static fn (StudyPlannerItem $a, StudyPlannerItem $b): int =>
            strcmp($a->getDate() . ($a->getTime() ?? '24:00'), $b->getDate() . ($b->getTime() ?? '24:00'))
            ?: ((int) $a->getId() <=> (int) $b->getId())
        );
        $api->items = array_map(
            static fn (StudyPlannerItem $item): array => [
            'id' => (string) $item->getId(),
            'subject' => $item->getSubject(),
            'subjectLabel' => $item->getSubjectLabel(),
            'kind' => $item->getKind(),
            'title' => $item->getTitle(),
            'date' => $item->getDate(),
            'time' => $item->getTime(),
            'end' => $item->getEndTime(),
            'note' => $item->getNote(),
            'done' => $item->getDoneAt()?->format(DateTimeInterface::ATOM),
            'createdAt' => $item->getCreatedAt()->format(DateTimeInterface::ATOM),
            ],
            $items
        );

        $api->rules = array_map(
            static fn (StudyPlannerRule $rule): array => [
            'id' => (string) $rule->getId(),
            'action' => $rule->getAction(),
            'course' => $rule->getCourse(),
            'weekday' => $rule->getWeekday(),
            'time' => $rule->getTime(),
            'location' => $rule->getLocation(),
            ],
            array_values($rules)
        );

        return $api;
    }

    /**
     * @param list<StudyPlannerRule> $rules
     *
     * @return array<string, mixed>
     */
    private function event(StudyPlannerEvent $event, array $rules, string $subject): array
    {
        $start = LeuvenTime::wall($event->getStartsAt());
        $end = null === $event->getEndsAt() ? null : LeuvenTime::wall($event->getEndsAt());
        if (null !== $end && $end['date'] !== $start['date']) {
            $end = null;
        }
        $hideRule = $this->matchingRule($rules, StudyPlannerRule::ACTION_HIDE, $event, $start);
        $mandatoryRule = $this->matchingRule($rules, StudyPlannerRule::ACTION_MANDATORY, $event, $start);
        $courseId = str_starts_with($subject, 'course:') ? (int) substr($subject, 7) : null;

        return [
            'uid' => $event->getUid(),
            'date' => $start['date'],
            'start' => $start['time'],
            'end' => $end['time'] ?? null,
            'startMin' => $start['minutes'],
            'endMin' => null !== $end ? max($end['minutes'], $start['minutes'] + 15) : $start['minutes'] + 60,
            'course' => StudyPlannerSubjects::courseName($event),
            'code' => $event->getCourseCode(),
            'subject' => $subject,
            'courseId' => $courseId,
            'type' => $event->getType(),
            'location' => null === $event->getLocation() ? null : self::room($event->getLocation()),
            'people' => $event->getPeople(),
            'done' => $event->isDone(),
            'hidden' => $event->isHidden() ? 'event' : (null !== $hideRule ? 'rule' : null),
            'hiddenRule' => null === $hideRule ? null : (string) $hideRule->getId(),
            'mandatory' => $event->isMandatory() ? 'event' : (null !== $mandatoryRule ? 'rule' : null),
            'mandatoryRule' => null === $mandatoryRule ? null : (string) $mandatoryRule->getId(),
        ];
    }

    /**
     * @param list<StudyPlannerRule> $rules
     * @param array{date: string, time: string, minutes: int, weekday: int} $start
     */
    private function matchingRule(array $rules, string $action, StudyPlannerEvent $event, array $start): ?StudyPlannerRule
    {
        foreach ($rules as $rule) {
            if ($rule->matches($action, $event->getCourse(), $start['weekday'], $start['time'], self::room($event->getLocation()))) {
                return $rule;
            }
        }

        return null;
    }
}
