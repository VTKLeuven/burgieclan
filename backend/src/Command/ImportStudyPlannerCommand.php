<?php

namespace App\Command;

use App\Entity\StudyPlanner;
use App\Entity\StudyPlannerEvent;
use App\Entity\StudyPlannerItem;
use App\Entity\StudyPlannerRule;
use App\Repository\StudyPlannerRepository;
use App\Repository\UserRepository;
use App\Service\StudyPlanner\LeuvenTime;
use App\Service\StudyPlanner\StudyPlannerState;
use App\Service\StudyPlanner\StudyPlannerSubjects;
use App\Service\StudyPlanner\TimetableUrl;
use DateTimeImmutable;
use DateTimeZone;
use Doctrine\ORM\EntityManagerInterface;
use Exception;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Moves a timetable kept by the stand-alone study tracker (the predecessor of the study planner)
 * into someone's study planner: its session history (events.json, including sessions that have
 * long left KU Leuven's feed) and, from its state folder, the ticks (checks.json) and the hidden
 * and mandatory marks, weekly rules and deadlines (planner.json).
 *
 * Sessions are merged by UID, so running it twice changes nothing; marks are only ever added.
 *
 *     php bin/console app:study-planner:import john_user /tmp/events.json --state=/tmp/calendar-state
 */
#[AsCommand(
    name: 'app:study-planner:import',
    description: "Imports a stand-alone study tracker's timetable history and marks into a user's study planner",
)]
final class ImportStudyPlannerCommand extends Command
{
    public function __construct(
        private readonly UserRepository $users,
        private readonly StudyPlannerRepository $planners,
        private readonly StudyPlannerState $state,
        private readonly StudyPlannerSubjects $subjects,
        private readonly EntityManagerInterface $entityManager,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addArgument('username', InputArgument::REQUIRED, 'Whose planner')
            ->addArgument('events', InputArgument::REQUIRED, 'Path of events.json')
            ->addOption('state', null, InputOption::VALUE_REQUIRED, 'Folder with checks.json and planner.json')
            ->addOption('url', null, InputOption::VALUE_REQUIRED, "Timetable link, when not events.json's sourceUrl");
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $user = $this->users->findOneBy(['username' => $input->getArgument('username')]);
        if (null === $user) {
            $io->error('No such user.');

            return Command::FAILURE;
        }
        $file = $this->json((string) $input->getArgument('events'));
        if (!is_array($file['events'] ?? null)) {
            $io->error('Not an events.json: no "events".');

            return Command::FAILURE;
        }
        $url = TimetableUrl::normalize((string) ($input->getOption('url') ?? $file['sourceUrl'] ?? ''));
        $planner = $this->planners->findForUser($user);
        if (null === $planner) {
            if (null === $url) {
                $io->error('No KU Leuven timetable link: pass --url.');

                return Command::FAILURE;
            }
            $planner = new StudyPlanner($user, $url);
            $this->entityManager->persist($planner);
        }

        $stored = [];
        foreach ($this->entityManager->getRepository(StudyPlannerEvent::class)->findBy(['planner' => $planner]) as $event) {
            $stored[$event->getUid()] = $event;
        }
        $imported = 0;
        foreach ($file['events'] as $raw) {
            $uid = is_string($raw['uid'] ?? null) ? $raw['uid'] : null;
            $start = $this->instant($raw['start'] ?? null, $raw['tz'] ?? 'utc');
            if (null === $uid || null === $start || !is_string($raw['course'] ?? null)) {
                continue;
            }
            $event = $stored[$uid] ?? null;
            if (null === $event) {
                $event = new StudyPlannerEvent($planner, $uid, $this->time($raw['firstSeen'] ?? null) ?? new DateTimeImmutable());
                $planner->addEvent($event);
                $this->entityManager->persist($event);
                $stored[$uid] = $event;
            }
            $event->update(
                $start,
                $this->instant($raw['end'] ?? null, $raw['tz'] ?? 'utc'),
                is_string($raw['courseCode'] ?? null) ? $raw['courseCode'] : null,
                $raw['course'],
                is_string($raw['people'] ?? null) ? $raw['people'] : null,
                is_string($raw['location'] ?? null) ? $raw['location'] : null,
                is_string($raw['type'] ?? null) ? $raw['type'] : 'other',
            );
            $removed = $this->time($raw['removedAt'] ?? null);
            if (null !== $removed) {
                $event->markRemoved($removed);
            }
            ++$imported;
        }
        $lastSync = $this->time($file['lastSync'] ?? null);
        if (null !== $lastSync && null === $planner->getLastSync()) {
            $planner->markSynced($lastSync);
        }
        $this->entityManager->flush();
        $io->text(sprintf('%d sessions', $imported));

        $dir = $input->getOption('state');
        if (is_string($dir)) {
            $this->importState($io, $planner, $stored, rtrim($dir, '/'));
        }
        $this->entityManager->flush();
        $io->success(sprintf('Imported into the planner of %s.', $user->getUsername()));

        return Command::SUCCESS;
    }

    /**
     * @param array<string, StudyPlannerEvent> $events
     */
    private function importState(SymfonyStyle $io, StudyPlanner $planner, array $events, string $dir): void
    {
        $checks = is_file($dir . '/checks.json') ? ($this->json($dir . '/checks.json')['checks'] ?? []) : [];
        $state = is_file($dir . '/planner.json') ? $this->json($dir . '/planner.json') : [];
        $counts = ['done' => 0, 'hidden' => 0, 'mandatory' => 0, 'rules' => 0, 'deadlines' => 0];

        foreach (['done' => $checks, 'hidden' => $state['hidden'] ?? [], 'mandatory' => $state['mandatory'] ?? []] as $mark => $map) {
            foreach (is_array($map) ? $map : [] as $uid => $at) {
                $event = $events[$uid] ?? null;
                if (null === $event) {
                    continue;
                }
                $when = $this->time($at) ?? new DateTimeImmutable();
                match ($mark) {
                    'done' => $event->setDone(true, $when),
                    'hidden' => $event->setHidden(true, $when),
                    'mandatory' => $event->setMandatory(true, $when),
                };
                ++$counts[$mark];
            }
        }

        foreach (is_array($state['rules'] ?? null) ? $state['rules'] : [] as $rule) {
            $action = $rule['action'] ?? null;
            if (!in_array($action, [StudyPlannerRule::ACTION_HIDE, StudyPlannerRule::ACTION_MANDATORY], true)) {
                continue;
            }
            $args = [(string) ($rule['course'] ?? ''), (int) ($rule['weekday'] ?? 0), (string) ($rule['time'] ?? ''), (string) ($rule['location'] ?? '')];
            foreach ($planner->getRules() as $existing) {
                if ($existing->matches($action, ...$args)) {
                    continue 2;
                }
            }
            $new = new StudyPlannerRule($planner, $action, ...$args);
            $planner->addRule($new);
            $this->entityManager->persist($new);
            ++$counts['rules'];
        }

        // Deadlines name their subject by its old key; find the subject with the same name now.
        $subjects = $this->subjects->resolve($this->state->activeEvents($planner))['subjects'];
        foreach (is_array($state['items'] ?? null) ? $state['items'] : [] as $raw) {
            if (!LeuvenTime::isValidDate($raw['date'] ?? null) || !is_string($raw['title'] ?? null)) {
                continue;
            }
            $label = (string) ($raw['subjectLabel'] ?? '');
            $key = 'name:' . $label;
            foreach ($subjects as $subject) {
                foreach ([$subject['label'], $subject['nameNl'], $subject['nameEn']] as $name) {
                    if (null !== $name && 0 === strcasecmp($name, $label)) {
                        $key = $subject['key'];
                        $label = $subject['label'];
                    }
                }
            }
            $time = LeuvenTime::isValidTime($raw['time'] ?? null) ? $raw['time'] : null;
            $item = (new StudyPlannerItem($planner))->fill(
                $key,
                $label,
                'mandatory' === ($raw['kind'] ?? null) ? StudyPlannerItem::KIND_MANDATORY : StudyPlannerItem::KIND_DEADLINE,
                mb_substr($raw['title'], 0, StudyPlannerItem::MAX_TITLE),
                $raw['date'],
                $time,
                null !== $time && LeuvenTime::isValidTime($raw['end'] ?? null) && $raw['end'] > $time ? $raw['end'] : null,
                mb_substr((string) ($raw['note'] ?? ''), 0, StudyPlannerItem::MAX_NOTE),
            );
            $done = $this->time($raw['done'] ?? null);
            if (null !== $done) {
                $item->setDone(true, $done);
            }
            $planner->addItem($item);
            $this->entityManager->persist($item);
            ++$counts['deadlines'];
        }

        $io->text(
            sprintf(
                '%d ticked off, %d hidden, %d mandatory, %d weekly rules, %d deadlines',
                $counts['done'],
                $counts['hidden'],
                $counts['mandatory'],
                $counts['rules'],
                $counts['deadlines'],
            )
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function json(string $path): array
    {
        $data = json_decode((string) file_get_contents($path), true);

        return is_array($data) ? $data : [];
    }

    private function time(mixed $value): ?DateTimeImmutable
    {
        if (!is_string($value)) {
            return null;
        }
        try {
            return new DateTimeImmutable($value);
        } catch (Exception) {
            return null;
        }
    }

    /** A time from events.json: "utc" = a UTC clock reading, "local" = Leuven wall clock. */
    private function instant(mixed $value, mixed $tz): ?DateTimeImmutable
    {
        if (!is_string($value) || !preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/', $value)) {
            return null;
        }
        $zone = 'local' === $tz ? LeuvenTime::zone() : new DateTimeZone('UTC');

        return (new DateTimeImmutable($value, $zone))->setTimezone(new DateTimeZone('UTC'));
    }
}
