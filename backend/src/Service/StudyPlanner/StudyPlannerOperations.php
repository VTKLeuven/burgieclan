<?php

namespace App\Service\StudyPlanner;

use App\ApiResource\StudyPlannerOperationInput;
use App\Entity\StudyPlanner;
use App\Entity\StudyPlannerEvent;
use App\Entity\StudyPlannerItem;
use App\Entity\StudyPlannerRule;
use DateTimeImmutable;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Applies one change from POST /api/study_planner/operations (see StudyPlannerOperationInput).
 */
class StudyPlannerOperations
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly StudyPlannerState $state,
        private readonly StudyPlannerSubjects $subjects,
    ) {}

    public function apply(StudyPlanner $planner, StudyPlannerOperationInput $input): void
    {
        $now = new DateTimeImmutable();
        switch ($input->op) {
            case 'done':
                $this->event($planner, $input)->setDone($this->value($input), $now);
                break;
            case 'hide':
                $this->event($planner, $input)->setHidden($this->value($input), $now);
                break;
            case 'mandatory':
                $this->event($planner, $input)->setMandatory($this->value($input), $now);
                break;
            case 'keepOnly':
                $this->keepOnly($planner, $this->event($planner, $input), $now);
                break;
            case 'addRule':
                $this->addRule($planner, $this->event($planner, $input), $input->action);
                break;
            case 'removeRule':
                $rule = $this->rule($planner, $input->id);
                $planner->removeRule($rule);
                break;
            case 'addItem':
                $item = new StudyPlannerItem($planner);
                $this->fillItem($planner, $item, $input->item);
                $planner->addItem($item);
                $this->entityManager->persist($item);
                break;
            case 'updateItem':
                $this->fillItem($planner, $this->item($planner, $input->id), $input->item);
                break;
            case 'deleteItem':
                $planner->removeItem($this->item($planner, $input->id));
                break;
            case 'itemDone':
                $this->item($planner, $input->id)->setDone($this->value($input), $now);
                break;
            default:
                throw new BadRequestHttpException('Unknown operation.');
        }
        $this->entityManager->flush();
    }

    private function value(StudyPlannerOperationInput $input): bool
    {
        if (null === $input->value) {
            throw new BadRequestHttpException('value is required.');
        }

        return $input->value;
    }

    private function event(StudyPlanner $planner, StudyPlannerOperationInput $input): StudyPlannerEvent
    {
        if (null === $input->uid || '' === $input->uid) {
            throw new BadRequestHttpException('uid is required.');
        }
        $event = $this->entityManager->getRepository(StudyPlannerEvent::class)
            ->findOneBy(['planner' => $planner, 'uid' => $input->uid, 'removedAt' => null]);

        return $event ?? throw new NotFoundHttpException('Unknown session.');
    }

    private function rule(StudyPlanner $planner, ?string $id): StudyPlannerRule
    {
        foreach ($planner->getRules() as $rule) {
            if ((string) $rule->getId() === $id) {
                return $rule;
            }
        }
        throw new NotFoundHttpException('Unknown rule.');
    }

    private function item(StudyPlanner $planner, ?string $id): StudyPlannerItem
    {
        foreach ($planner->getItems() as $item) {
            if ((string) $item->getId() === $id) {
                return $item;
            }
        }
        throw new NotFoundHttpException('Unknown deadline.');
    }

    /** Hides the other sessions of the same course in the same week, and shows this one. */
    private function keepOnly(StudyPlanner $planner, StudyPlannerEvent $event, DateTimeImmutable $now): void
    {
        $week = LeuvenTime::mondayOf(LeuvenTime::wall($event->getStartsAt())['date']);
        foreach ($this->state->activeEvents($planner) as $other) {
            if ($other === $event || $other->getCourse() !== $event->getCourse()) {
                continue;
            }
            if (LeuvenTime::mondayOf(LeuvenTime::wall($other->getStartsAt())['date']) === $week) {
                $other->setHidden(true, $now);
            }
        }
        $event->setHidden(false, $now);
    }

    private function addRule(StudyPlanner $planner, StudyPlannerEvent $event, ?string $action): void
    {
        if (StudyPlannerRule::ACTION_HIDE !== $action && StudyPlannerRule::ACTION_MANDATORY !== $action) {
            throw new BadRequestHttpException('action must be hide or mandatory.');
        }
        $start = LeuvenTime::wall($event->getStartsAt());
        $room = StudyPlannerState::room($event->getLocation());
        foreach ($planner->getRules() as $rule) {
            if ($rule->matches($action, $event->getCourse(), $start['weekday'], $start['time'], $room)) {
                return;
            }
        }
        $rule = new StudyPlannerRule($planner, $action, $event->getCourse(), $start['weekday'], $start['time'], $room);
        $planner->addRule($rule);
        $this->entityManager->persist($rule);
    }

    /**
     * @param array<string, mixed>|null $input
     */
    private function fillItem(StudyPlanner $planner, StudyPlannerItem $item, ?array $input): void
    {
        if (null === $input) {
            throw new BadRequestHttpException('item is required.');
        }
        $subjects = $this->subjects->resolve($this->state->activeEvents($planner))['subjects'];
        $subject = null;
        foreach ($subjects as $candidate) {
            if ($candidate['key'] === ($input['subject'] ?? null)) {
                $subject = $candidate;
            }
        }
        // An item may keep a subject that has since left the timetable.
        if (null === $subject && null !== $item->getId() && $item->getSubject() === ($input['subject'] ?? null)) {
            $subject = ['key' => $item->getSubject(), 'label' => $item->getSubjectLabel()];
        }
        if (null === $subject) {
            throw new BadRequestHttpException('Unknown course.');
        }

        $kind = $input['kind'] ?? null;
        if (StudyPlannerItem::KIND_DEADLINE !== $kind && StudyPlannerItem::KIND_MANDATORY !== $kind) {
            throw new BadRequestHttpException('kind must be deadline or mandatory.');
        }
        $title = trim(is_string($input['title'] ?? null) ? $input['title'] : '');
        if ('' === $title || mb_strlen($title) > StudyPlannerItem::MAX_TITLE) {
            throw new BadRequestHttpException(sprintf('title must be 1 to %d characters.', StudyPlannerItem::MAX_TITLE));
        }
        $date = $input['date'] ?? null;
        if (!LeuvenTime::isValidDate($date)) {
            throw new BadRequestHttpException('date must be YYYY-MM-DD.');
        }
        $time = is_string($input['time'] ?? null) && '' !== trim($input['time']) ? trim($input['time']) : null;
        if (null !== $time && !LeuvenTime::isValidTime($time)) {
            throw new BadRequestHttpException('time must be HH:MM.');
        }
        $end = StudyPlannerItem::KIND_MANDATORY === $kind && is_string($input['end'] ?? null) && '' !== trim($input['end'])
            ? trim($input['end'])
            : null;
        if (null !== $end && (!LeuvenTime::isValidTime($end) || null === $time || $end <= $time)) {
            throw new BadRequestHttpException('end must be HH:MM, after the start time.');
        }
        $note = trim(is_string($input['note'] ?? null) ? $input['note'] : '');
        if (mb_strlen($note) > StudyPlannerItem::MAX_NOTE) {
            throw new BadRequestHttpException(sprintf('note must be at most %d characters.', StudyPlannerItem::MAX_NOTE));
        }

        $item->fill($subject['key'], $subject['label'], $kind, $title, $date, $time, $end, $note);
    }
}
