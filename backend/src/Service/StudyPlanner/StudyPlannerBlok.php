<?php

namespace App\Service\StudyPlanner;

use App\ApiResource\StudyPlannerOperationInput;
use App\Entity\Course;
use App\Entity\StudyPlannerExam;
use App\Entity\StudyPlannerFreeDay;
use App\Entity\StudyPlannerSession;
use App\Entity\StudyPlannerTask;
use App\Entity\User;
use DateTimeImmutable;
use DateTimeInterface;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * The "Blok" calendar of the study planner: the exams someone puts in it, what they plan to study
 * each day (StudyPlannerTask), the days they keep free, and the study timer (StudyPlannerSession).
 * Nothing is planned for them; they fill it in themselves. It belongs to the user and needs no
 * timetable.
 *
 * Applies the operations of POST /api/study_planner/operations listed in self::OPS (see
 * StudyPlannerOperationInput) and shows it in the planner (StudyPlannerState).
 */
class StudyPlannerBlok
{
    public const OPS = [
        'addExam', 'updateExam', 'deleteExam',
        'addTask', 'updateTask', 'deleteTask', 'taskDone', 'catchUp',
        'freeDay', 'timerStart', 'timerPause', 'deleteSession',
    ];

    public const MAX_LABEL = 200;

    public function __construct(
        private readonly EntityManagerInterface $entityManager,
    ) {}

    public function apply(User $user, StudyPlannerOperationInput $input, DateTimeImmutable $now): void
    {
        $today = LeuvenTime::wall($now)['date'];
        switch ($input->op) {
            case 'addExam':
                if ($this->count(StudyPlannerExam::class, $user) >= StudyPlannerExam::MAX_PER_USER) {
                    throw new BadRequestHttpException(sprintf('You can have at most %d exams.', StudyPlannerExam::MAX_PER_USER));
                }
                $exam = new StudyPlannerExam($user);
                $this->fillExam($exam, $input->exam);
                $this->entityManager->persist($exam);
                break;
            case 'updateExam':
                $this->fillExam($this->own(StudyPlannerExam::class, $user, $input->id), $input->exam);
                break;
            case 'deleteExam':
                $this->entityManager->remove($this->own(StudyPlannerExam::class, $user, $input->id));
                break;
            case 'addTask':
                if ($this->count(StudyPlannerTask::class, $user) >= StudyPlannerTask::MAX_PER_USER) {
                    throw new BadRequestHttpException(sprintf('You can have at most %d tasks.', StudyPlannerTask::MAX_PER_USER));
                }
                $task = new StudyPlannerTask($user);
                $this->fillTask($task, $input->task);
                $this->entityManager->persist($task);
                break;
            case 'updateTask':
                $this->fillTask($this->own(StudyPlannerTask::class, $user, $input->id), $input->task);
                break;
            case 'deleteTask':
                $this->entityManager->remove($this->own(StudyPlannerTask::class, $user, $input->id));
                break;
            case 'taskDone':
                if (null === $input->value) {
                    throw new BadRequestHttpException('value is required.');
                }
                $this->own(StudyPlannerTask::class, $user, $input->id)->setDone($input->value, $now);
                break;
            case 'catchUp':
                $this->catchUp($user, $this->date($input->date), $today);
                break;
            case 'freeDay':
                $this->freeDay($user, $this->date($input->date), true === $input->value);
                break;
            case 'timerStart':
                if (null === $this->running($user)) {
                    $this->entityManager->persist(new StudyPlannerSession($user, $today, $now));
                }
                break;
            case 'timerPause':
                $this->running($user)?->end($now);
                break;
            case 'deleteSession':
                $this->entityManager->remove($this->own(StudyPlannerSession::class, $user, $input->id));
                break;
            default:
                throw new BadRequestHttpException('Unknown operation.');
        }
        $this->entityManager->flush();
    }

    /**
     * Everything of the "Blok" calendar, sorted by date: `exams` (id, subject, subjectLabel, date,
     * time), `tasks` (id, date, subject, subjectLabel, title, done), `freeDays` (dates) and
     * `sessions` (id, date, start, end: ISO 8601, end null while running).
     *
     * @return array{exams: list<array<string, mixed>>, tasks: list<array<string, mixed>>, freeDays: list<string>, sessions: list<array<string, mixed>>}
     */
    public function view(User $user): array
    {
        /** @var list<StudyPlannerExam> $exams */
        $exams = $this->entityManager->getRepository(StudyPlannerExam::class)->findBy(['user' => $user], ['date' => 'ASC', 'time' => 'ASC', 'id' => 'ASC']);
        /** @var list<StudyPlannerTask> $tasks */
        $tasks = $this->entityManager->getRepository(StudyPlannerTask::class)->findBy(['user' => $user], ['date' => 'ASC', 'id' => 'ASC']);
        /** @var list<StudyPlannerFreeDay> $free */
        $free = $this->entityManager->getRepository(StudyPlannerFreeDay::class)->findBy(['user' => $user], ['date' => 'ASC']);
        /** @var list<StudyPlannerSession> $sessions */
        $sessions = $this->entityManager->getRepository(StudyPlannerSession::class)->findBy(['user' => $user], ['startedAt' => 'ASC']);

        return [
            'exams' => array_map(
                static fn (StudyPlannerExam $e): array => [
                'id' => (string) $e->getId(),
                'subject' => $e->getSubject(),
                'subjectLabel' => $e->getSubjectLabel(),
                'date' => $e->getDate(),
                'time' => $e->getTime(),
                ],
                $exams
            ),
            'tasks' => array_map(
                static fn (StudyPlannerTask $t): array => [
                'id' => (string) $t->getId(),
                'date' => $t->getDate(),
                'subject' => $t->getSubject(),
                'subjectLabel' => $t->getSubjectLabel(),
                'title' => $t->getTitle(),
                'done' => null !== $t->getDoneAt(),
                ],
                $tasks
            ),
            'freeDays' => array_map(static fn (StudyPlannerFreeDay $d): string => $d->getDate(), $free),
            'sessions' => array_map(
                static fn (StudyPlannerSession $s): array => [
                'id' => (string) $s->getId(),
                'date' => $s->getDate(),
                'start' => $s->getStartedAt()->format(DateTimeInterface::ATOM),
                'end' => $s->getEndedAt()?->format(DateTimeInterface::ATOM),
                ],
                $sessions
            ),
        ];
    }

    /**
     * @template T of object
     *
     * @param class-string<T> $class
     *
     * @return T
     */
    private function own(string $class, User $user, ?string $id): object
    {
        $entity = null !== $id && ctype_digit($id) ? $this->entityManager->getRepository($class)->findOneBy(['id' => (int) $id, 'user' => $user]) : null;

        return $entity ?? throw new NotFoundHttpException('Not found.');
    }

    /**
     * @param class-string $class
     */
    private function count(string $class, User $user): int
    {
        return $this->entityManager->getRepository($class)->count(['user' => $user]);
    }

    private function running(User $user): ?StudyPlannerSession
    {
        return $this->entityManager->getRepository(StudyPlannerSession::class)->findOneBy(['user' => $user, 'endedAt' => null]);
    }

    private function date(mixed $value): string
    {
        if (!LeuvenTime::isValidDate($value)) {
            throw new BadRequestHttpException('date must be YYYY-MM-DD.');
        }

        return $value;
    }

    /** Moves every task that is past and not ticked off to $date, today or later. */
    private function catchUp(User $user, string $date, string $today): void
    {
        if ($date < $today) {
            throw new BadRequestHttpException('Move them to today or later.');
        }
        $tasks = $this->entityManager->createQueryBuilder()
            ->select('t')
            ->from(StudyPlannerTask::class, 't')
            ->where('t.user = :user')
            ->andWhere('t.date < :today')
            ->andWhere('t.doneAt IS NULL')
            ->setParameter('user', $user)
            ->setParameter('today', $today)
            ->getQuery()
            ->getResult();
        foreach ($tasks as $task) {
            assert($task instanceof StudyPlannerTask);
            $task->setDate($date);
        }
    }

    private function freeDay(User $user, string $date, bool $free): void
    {
        $day = $this->entityManager->getRepository(StudyPlannerFreeDay::class)->findOneBy(['user' => $user, 'date' => $date]);
        if ($free && null === $day) {
            $this->entityManager->persist(new StudyPlannerFreeDay($user, $date));
        } elseif (!$free && null !== $day) {
            $this->entityManager->remove($day);
        }
    }

    /**
     * @param array<string, mixed>|null $input {"subject", "date", "time"}
     */
    private function fillExam(StudyPlannerExam $exam, ?array $input): void
    {
        if (null === $input) {
            throw new BadRequestHttpException('exam is required.');
        }
        $subject = $this->subject($input['subject'] ?? null) ?? throw new BadRequestHttpException('An exam needs a course.');
        $date = $this->date($input['date'] ?? null);
        $time = is_string($input['time'] ?? null) && '' !== trim($input['time']) ? trim($input['time']) : null;
        if (null !== $time && !LeuvenTime::isValidTime($time)) {
            throw new BadRequestHttpException('time must be HH:MM.');
        }
        $exam->fill($subject['key'], $subject['label'], $date, $time);
    }

    /**
     * @param array<string, mixed>|null $input {"date", "subject" (or null), "title"}
     */
    private function fillTask(StudyPlannerTask $task, ?array $input): void
    {
        if (null === $input) {
            throw new BadRequestHttpException('task is required.');
        }
        $date = $this->date($input['date'] ?? null);
        $subject = $this->subject($input['subject'] ?? null);
        $title = trim(preg_replace('/\s+/u', ' ', is_string($input['title'] ?? null) ? $input['title'] : '') ?? '');
        if ('' === $title && null !== $subject) {
            // "Linear Algebra" on its own is a plan too.
            $title = $subject['label'];
        }
        if ('' === $title || mb_strlen($title) > StudyPlannerTask::MAX_TITLE) {
            throw new BadRequestHttpException(sprintf('title must be 1 to %d characters.', StudyPlannerTask::MAX_TITLE));
        }
        $task->fill($date, $subject['key'] ?? null, $subject['label'] ?? null, $title);
    }

    /**
     * null or "" for none; "course:12" for a Burgieclan course, named as the catalogue names it;
     * "name:Thermal Systems" for any course, by the name typed in.
     *
     * @return array{key: string, label: string}|null
     */
    private function subject(mixed $value): ?array
    {
        if (null === $value || '' === $value) {
            return null;
        }
        $value = is_string($value) ? $value : '';
        if (1 === preg_match('/^course:(\d{1,10})$/', $value, $m)) {
            $course = $this->entityManager->find(Course::class, (int) $m[1]);
            if (!$course instanceof Course) {
                throw new BadRequestHttpException('Unknown course.');
            }

            return ['key' => $value, 'label' => $course->getCatalogName()];
        }
        if (str_starts_with($value, 'name:')) {
            $label = trim(preg_replace('/\s+/u', ' ', substr($value, 5)) ?? '');
            if ('' !== $label && mb_strlen($label) <= self::MAX_LABEL) {
                return ['key' => 'name:' . $label, 'label' => $label];
            }
        }

        throw new BadRequestHttpException(sprintf('subject must be "course:{id}" or "name:{1 to %d characters}".', self::MAX_LABEL));
    }
}
