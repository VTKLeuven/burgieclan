<?php

namespace App\Service\StudyPlanner;

use App\Entity\StudyPlanner;
use App\Entity\StudyPlannerEvent;
use DateTimeImmutable;
use Doctrine\DBAL\LockMode;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use RuntimeException;
use Symfony\Contracts\HttpClient\Exception\ExceptionInterface as HttpClientException;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Brings a study planner's sessions up to date with its KU Leuven timetable feed.
 *
 * The feed is a rolling window, so a sync merges rather than replaces: a new UID is added, a known
 * one takes over what the feed now says, and nothing is ever deleted. A stored session missing
 * from the feed although it falls inside the feed's window (on or after its earliest session) was
 * taken out by KU Leuven and is marked removed; older ones simply fell out of the window.
 *
 * Syncs happen when the planner or its exported calendar is read and the last one is older than
 * self::STALE_AFTER, and on request ("Sync now"). A failing feed is not tried again for
 * self::RETRY_AFTER, so a broken link does not slow down every page view.
 */
class StudyPlannerSync
{
    public const STALE_AFTER = '-1 hour';
    public const RETRY_AFTER = '-15 minutes';
    private const MAX_BYTES = 5_000_000;

    public function __construct(
        private readonly HttpClientInterface $httpClient,
        private readonly IcsParser $parser,
        private readonly EntityManagerInterface $entityManager,
        private readonly LoggerInterface $logger,
    ) {}

    public function isStale(StudyPlanner $planner, DateTimeImmutable $now = new DateTimeImmutable()): bool
    {
        $attempt = $planner->getLastAttempt();
        if (null !== $attempt && null !== $planner->getSyncError() && $attempt > $now->modify(self::RETRY_AFTER)) {
            return false;
        }
        $sync = $planner->getLastSync();

        return null === $sync || $sync <= $now->modify(self::STALE_AFTER);
    }

    public function syncIfStale(StudyPlanner $planner): void
    {
        if ($this->isStale($planner)) {
            $this->sync($planner);
        }
    }

    /**
     * @return bool whether the feed could be read; when not, StudyPlanner::getSyncError() says why
     */
    public function sync(StudyPlanner $planner): bool
    {
        $now = new DateTimeImmutable();
        try {
            $sessions = $this->parser->parse($this->fetch($planner->getIcsUrl()));
            if ([] === $sessions) {
                throw new RuntimeException('The timetable link returned no sessions.');
            }
        } catch (RuntimeException | HttpClientException $e) {
            $this->logger->info('Study planner sync failed', ['planner' => $planner->getId(), 'error' => $e->getMessage()]);
            $planner->markSyncFailed(
                $now,
                $e instanceof HttpClientException
                ? 'The timetable could not be reached.'
                : $e->getMessage()
            );
            $this->entityManager->flush();

            return false;
        }

        $this->entityManager->wrapInTransaction(
            function () use ($planner, $sessions, $now): void {
            // Two syncs of one planner at once (the page and the calendar feed) would both add the
            // same new sessions; the second waits here until the first is done, then finds them.
                $this->entityManager->lock($planner, LockMode::PESSIMISTIC_WRITE);

            /** @var array<string, StudyPlannerEvent> $stored */
                $stored = [];
                $rows = $this->entityManager->getRepository(StudyPlannerEvent::class)->findBy(['planner' => $planner]);
                foreach ($rows as $event) {
                    $stored[$event->getUid()] = $event;
                }

                $seen = [];
                $windowStart = null;
                foreach ($sessions as $session) {
                    $uid = $session['uid'];
                    if (isset($seen[$uid])) {
                        continue;
                    }
                    $seen[$uid] = true;
                    if (null === $windowStart || $session['start'] < $windowStart) {
                        $windowStart = $session['start'];
                    }
                    $event = $stored[$uid] ?? null;
                    if (null === $event) {
                        $event = new StudyPlannerEvent($planner, $uid, $now);
                        $planner->addEvent($event);
                        $this->entityManager->persist($event);
                        $stored[$uid] = $event;
                    }
                    $event->update(
                        $session['start'],
                        $session['end'],
                        $session['courseCode'],
                        $session['course'],
                        $session['people'],
                        $session['location'],
                        $session['type'],
                    );
                }

                foreach ($stored as $uid => $event) {
                    if (!isset($seen[$uid]) && null === $event->getRemovedAt() && $event->getStartsAt() >= $windowStart) {
                        $event->markRemoved($now);
                    }
                }

                $planner->markSynced($now);
            }
        );

        return true;
    }

    private function fetch(string $url): string
    {
        $response = $this->httpClient->request(
            'GET',
            $url,
            [
            'timeout' => 15,
            'max_duration' => 30,
            // TimetableUrl only lets through links to TimeEdit; a redirect could lead anywhere.
            'max_redirects' => 0,
            'headers' => ['Accept' => 'text/calendar', 'User-Agent' => 'Burgieclan study planner'],
            'on_progress' => static function (int $downloaded): void {
                if ($downloaded > self::MAX_BYTES) {
                    throw new RuntimeException('The timetable is too large.');
                }
            },
            ]
        );
        $status = $response->getStatusCode();
        if (404 === $status || 410 === $status) {
            throw new RuntimeException('The timetable link no longer exists. Paste a new one.');
        }
        if ($status < 200 || $status >= 300) {
            throw new RuntimeException(sprintf('The timetable answered with HTTP %d.', $status));
        }
        $body = $response->getContent();
        if (!str_contains($body, 'BEGIN:VCALENDAR')) {
            throw new RuntimeException('The timetable link does not return a calendar.');
        }

        return $body;
    }
}
