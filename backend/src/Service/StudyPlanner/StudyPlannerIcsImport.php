<?php

namespace App\Service\StudyPlanner;

use App\Entity\StudyPlanner;
use App\Entity\StudyPlannerEvent;
use DateTimeImmutable;
use Doctrine\DBAL\LockMode;
use Doctrine\ORM\EntityManagerInterface;
use RuntimeException;

/**
 * Fills in the sessions a timetable feed no longer has, from a calendar file the student uploads.
 *
 * KU Leuven's feed only reaches a few weeks back, and StudyPlannerSync keeps what it has seen from
 * the first sync on, so whoever starts mid-semester misses everything before that. A calendar that
 * did keep those sessions (an export of another planner, a calendar app's copy) fills the gap.
 *
 * Only what lies before the planner's own history is taken: sessions starting before the earliest
 * one the feed ever gave, and before now. The feed stays the only source for everything after, so
 * an import can never put a second copy of a live session next to it, nor be marked removed by a
 * later sync (which only looks from the feed's earliest session on). A session already stored under
 * the same UID, or under a UID with the same part before the "@" (an export of the same TimeEdit
 * session by another planner), is skipped. All-day events are left out: deadlines and the like, not
 * sessions. A "Mandatory: " title marks the session as mandatory.
 *
 * Nothing is overwritten, so importing the same file twice adds nothing the second time.
 */
class StudyPlannerIcsImport
{
    public const MAX_BYTES = 2_000_000;
    public const MAX_SESSIONS = 5000;

    public function __construct(
        private readonly IcsParser $parser,
        private readonly EntityManagerInterface $entityManager,
    ) {}

    /**
     * @return int the number of sessions added
     *
     * @throws RuntimeException with a message for the student when the file is not a calendar
     */
    public function import(StudyPlanner $planner, string $ics, DateTimeImmutable $now = new DateTimeImmutable()): int
    {
        if (strlen($ics) > self::MAX_BYTES) {
            throw new RuntimeException('This calendar is too large.');
        }
        if (!str_contains($ics, 'BEGIN:VCALENDAR')) {
            throw new RuntimeException('This is not a calendar file (.ics).');
        }
        $sessions = array_values(array_filter($this->parser->parse($ics), static fn (array $s): bool => !$s['allDay']));
        if ([] === $sessions) {
            throw new RuntimeException('This calendar has no sessions.');
        }
        if (count($sessions) > self::MAX_SESSIONS) {
            throw new RuntimeException('This calendar has too many sessions.');
        }

        return $this->entityManager->wrapInTransaction(
            function () use ($planner, $sessions, $now): int {
                // Not at the same time as a sync of the same planner, which decides what is "before".
                $this->entityManager->lock($planner, LockMode::PESSIMISTIC_WRITE);

                $cutoff = $now;
                $known = [];
                foreach ($this->entityManager->getRepository(StudyPlannerEvent::class)->findBy(['planner' => $planner]) as $event) {
                    $known[self::key($event->getUid())] = true;
                    if ($event->getStartsAt() < $cutoff) {
                        $cutoff = $event->getStartsAt();
                    }
                }

                $added = 0;
                foreach ($sessions as $session) {
                    $key = self::key($session['uid']);
                    if (isset($known[$key]) || $session['start'] >= $cutoff) {
                        continue;
                    }
                    $known[$key] = true;
                    $event = new StudyPlannerEvent($planner, $session['uid'], $now);
                    $event->update(
                        $session['start'],
                        $session['end'],
                        $session['courseCode'],
                        $session['course'],
                        $session['people'],
                        $session['location'],
                        $session['type'],
                    );
                    if ($session['mandatory']) {
                        $event->setMandatory(true, $now);
                    }
                    $planner->addEvent($event);
                    $this->entityManager->persist($event);
                    ++$added;
                }

                return $added;
            }
        );
    }

    /** "5874805-1311329119-0@timeedit.com" and "5874805-1311329119-0@cursus.example" are one session. */
    private static function key(string $uid): string
    {
        $at = strrpos($uid, '@');

        return strtolower(false === $at || 0 === $at ? $uid : substr($uid, 0, $at));
    }
}
