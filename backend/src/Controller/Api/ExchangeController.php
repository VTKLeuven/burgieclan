<?php

namespace App\Controller\Api;

use App\Constants\ExchangeProgram;
use App\Constants\ExchangeTopic;
use App\Entity\ExchangeDestination;
use App\Entity\ExchangeProgramSuggestion;
use App\Entity\ExchangeReport;
use App\Entity\ExchangeReportFile;
use App\Entity\ExchangeReportHelpful;
use App\Entity\User;
use App\Repository\ExchangeDestinationRepository;
use App\Repository\ExchangeReportRepository;
use App\Service\Exchange\ExchangeReportFileStore;
use App\Service\Exchange\ExchangeReportFileUrlGenerator;
use App\Service\Exchange\InvalidExchangeFileException;
use App\Service\RateLimit\UserRateLimiter;
use DateTimeImmutable;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Target;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Throwable;

/**
 * Exchange destinations and the reports of students who went there. Behind the EXCHANGE feature
 * (FeatureGateListener, by the `api_exchange_` route names).
 *
 * - GET /api/exchange: {"destinations", "recent"}: every destination the user may see with its
 *   number of approved reports, and pieces of the latest reports.
 * - GET /api/exchange/destinations/{id}: {"destination", "reports", "nearby"}: the approved
 *   reports, plus the user's own ones still under review.
 * - POST /api/exchange/reports: a new report, under review until a moderator approves it. Takes
 *   either "destinationId" or "newDestination" {name, city, country}, which adds an unapproved
 *   destination. 201 {"id", "destinationId"}, or 422 {"detail"}. Sent as multipart instead, with
 *   that JSON as the `report` field, it also takes up to ExchangeReportFileStore::MAX_FILES
 *   files as `files[]` (a 422 then carries a `reason`: "size", "type", "count" or "failed").
 * - GET /api/exchange/reports/{id}/files/{fileId}: {"url"}, a short-lived link to an attached file.
 * - DELETE /api/exchange/reports/{id}: by its author or a moderator. 204.
 * - PUT /api/exchange/reports/{id}/helpful {"part", "helpful": bool}: "Nuttig" on a topic of an
 *   approved report, or on one of its courses ("course-{index}"). 204.
 * - POST /api/exchange/destinations/{id}/program_suggestions {"add": [code], "remove": [code],
 *   "note"}: says a destination is (no longer) open to some programmes, for a moderator to check.
 *   201, or 422 {"detail"}.
 */
#[IsGranted(User::ROLE_USER)]
class ExchangeController extends AbstractController
{
    public const MAX_SECTION_LENGTH = 6000;
    public const MAX_COURSES = 20;
    private const RECENT = 3;
    private const EXCERPT_LENGTH = 320;

    public function __construct(
        private readonly ExchangeDestinationRepository $destinations,
        private readonly ExchangeReportRepository $reports,
        private readonly EntityManagerInterface $entityManager,
        private readonly ExchangeReportFileStore $fileStore,
        private readonly ExchangeReportFileUrlGenerator $fileUrls,
    ) {}

    #[Route('/api/exchange', name: 'api_exchange_overview', methods: ['GET'])]
    public function overview(): JsonResponse
    {
        $user = $this->user();
        $summary = $this->reports->summaryPerDestination();

        $recent = [];
        foreach ($this->reports->findLatestApproved(self::RECENT * 3) as $report) {
            $sections = $report->getSections();
            if ([] === $sections || count($recent) >= self::RECENT) {
                continue;
            }
            // The longest part says the most on its own.
            uasort($sections, static fn (string $a, string $b): int => mb_strlen($b) <=> mb_strlen($a));
            $topic = (string) array_key_first($sections);
            $recent[] = [
                'reportId' => $report->getId(),
                'destination' => ['id' => $report->getDestination()->getId(), 'name' => $report->getDestination()->getName()],
                'topic' => $topic,
                'excerpt' => self::excerpt($sections[$topic]),
                'academicYear' => $report->getAcademicYear(),
                'program' => $report->getProgram(),
            ];
        }

        return self::private(
            [
            'destinations' => array_map(
                fn (ExchangeDestination $destination): array => $this->serializeDestination($destination, $summary),
                $this->destinations->findVisibleTo($user)
            ),
            'recent' => $recent,
            ]
        );
    }

    #[Route('/api/exchange/destinations/{id}', name: 'api_exchange_destination', requirements: ['id' => '\d+'], methods: ['GET'])]
    public function destination(int $id): JsonResponse
    {
        $user = $this->user();
        $destination = $this->destinations->find($id);
        if (null === $destination || !$this->canSee($destination, $user)) {
            return self::private(['detail' => 'Destination not found.'], Response::HTTP_NOT_FOUND);
        }

        $reports = $this->reports->findForDestination($destination, $user);
        $helpful = $this->reports->helpfulFor($reports, $user);
        $summary = $this->reports->summaryPerDestination();

        $nearby = array_values(
            array_filter(
                $this->destinations->findBy(['country' => $destination->getCountry(), 'approved' => true], ['name' => 'ASC']),
                static fn (ExchangeDestination $other): bool => $other->getId() !== $destination->getId()
            )
        );

        $pending = $this->entityManager->getRepository(ExchangeProgramSuggestion::class)->findBy(
            ['destination' => $destination, 'author' => $user, 'status' => ExchangeProgramSuggestion::STATUS_PENDING]
        );

        return self::private(
            [
            'destination' => $this->serializeDestination($destination, $summary) + ['website' => $destination->getWebsite()],
            'pendingSuggestions' => array_map(
                static fn (ExchangeProgramSuggestion $suggestion): array => ['program' => $suggestion->getProgram(), 'action' => $suggestion->getAction()],
                $pending
            ),
            'reports' => array_map(
                fn (ExchangeReport $report): array => $this->serializeReport($report, $user, $helpful),
                $reports
            ),
            'nearby' => array_map(
                fn (ExchangeDestination $other): array => $this->serializeDestination($other, $summary),
                $nearby
            ),
            ]
        );
    }

    #[Route('/api/exchange/reports', name: 'api_exchange_report_create', methods: ['POST'])]
    public function create(
        Request $request,
        UserRateLimiter $rateLimiter,
        #[Target('exchange_report')]
        RateLimiterFactoryInterface $limiter,
    ): JsonResponse {
        $user = $this->user();
        $multipart = 'form' === $request->getContentTypeFormat();
        $payload = json_decode($multipart ? (string) $request->request->get('report', '') : $request->getContent(), true);
        if (!is_array($payload)) {
            return self::invalid($multipart ? 'Expected the report as JSON in the "report" field.' : 'Expected a JSON object.');
        }

        $uploads = $multipart ? array_values(array_filter($request->files->all('files'), static fn (mixed $file): bool => $file instanceof UploadedFile)) : [];
        if (count($uploads) > ExchangeReportFileStore::MAX_FILES) {
            return self::invalid(sprintf('Attach at most %d files.', ExchangeReportFileStore::MAX_FILES), 'count');
        }
        try {
            foreach ($uploads as $upload) {
                $this->fileStore->check($upload);
            }
        } catch (InvalidExchangeFileException $exception) {
            return self::invalid($exception->getMessage(), $exception->reason);
        }

        $academicYear = $payload['academicYear'] ?? null;
        if (!is_string($academicYear) || !self::isAcademicYear($academicYear)) {
            return self::invalid('Choose the academic year of your exchange.');
        }
        $phase = $payload['phase'] ?? null;
        if (!in_array($phase, ExchangeReport::PHASES, true)) {
            return self::invalid('Choose M1 or M2.');
        }
        $period = $payload['period'] ?? null;
        if (!in_array($period, ExchangeReport::PERIODS, true)) {
            return self::invalid('Choose the first semester, the second semester or the whole year.');
        }
        $program = is_string($payload['program'] ?? null) ? ExchangeProgram::tryFrom($payload['program']) : null;
        if (null === $program) {
            return self::invalid('Choose your programme.');
        }

        $sections = [];
        $rawSections = $payload['sections'] ?? [];
        if (!is_array($rawSections)) {
            return self::invalid('Expected "sections" as an object of texts per topic.');
        }
        foreach (ExchangeTopic::cases() as $topic) {
            $text = $rawSections[$topic->value] ?? '';
            if (!is_string($text)) {
                return self::invalid('Expected text for every topic.');
            }
            if (mb_strlen($text) > self::MAX_SECTION_LENGTH) {
                return self::invalid(sprintf('Keep each topic under %d characters.', self::MAX_SECTION_LENGTH));
            }
            $sections[$topic->value] = $text;
        }

        $courses = self::parseCourses($payload['courses'] ?? []);
        if (null === $courses) {
            return self::invalid(sprintf('Add at most %d courses, each with a name.', self::MAX_COURSES));
        }

        if ('' === trim(implode('', $sections)) && [] === $courses && [] === $uploads) {
            return self::invalid('Write about at least one topic or course, or attach a file.');
        }

        $destination = $this->resolveDestination($payload, $user, $program);
        if (is_string($destination)) {
            return self::invalid($destination);
        }

        $rateLimiter->consume($limiter, 'You shared a lot of reports today. Try again tomorrow.');

        $report = (new ExchangeReport($destination, $user))
            ->setAcademicYear($academicYear)
            ->setPhase($phase)
            ->setPeriod($period)
            ->setProgram($program->value)
            ->setSections($sections)
            ->setCourses($courses)
            ->setContactable(true === ($payload['contactable'] ?? false))
            ->setShowName(true === ($payload['showName'] ?? false));

        $stored = [];
        try {
            foreach ($uploads as $upload) {
                $stored[] = $this->fileStore->store($report, $upload)->getFileName();
            }
            $this->entityManager->persist($report);
            $this->entityManager->flush();
        } catch (Throwable $exception) {
            foreach ($stored as $fileName) {
                $this->fileStore->deleteFile($fileName);
            }
            if ($exception instanceof InvalidExchangeFileException) {
                return self::invalid($exception->getMessage(), $exception->reason);
            }

            throw $exception;
        }

        return self::private(['id' => $report->getId(), 'destinationId' => $destination->getId()], Response::HTTP_CREATED);
    }

    #[Route('/api/exchange/reports/{id}', name: 'api_exchange_report_delete', requirements: ['id' => '\d+'], methods: ['DELETE'])]
    public function delete(int $id): Response
    {
        $user = $this->user();
        $report = $this->reports->find($id);
        if (null === $report || !$this->canSeeReport($report, $user)) {
            return self::private(['detail' => 'Report not found.'], Response::HTTP_NOT_FOUND);
        }
        if ($report->getAuthor()?->getId() !== $user->getId() && !$this->isGranted(User::ROLE_MODERATOR)) {
            return self::private(['detail' => 'Only its author can delete a report.'], Response::HTTP_FORBIDDEN);
        }

        $this->entityManager->remove($report);
        $this->entityManager->flush();

        return new Response(null, Response::HTTP_NO_CONTENT);
    }

    #[Route(
        '/api/exchange/reports/{id}/files/{fileId}',
        name: 'api_exchange_report_file',
        requirements: ['id' => '\d+', 'fileId' => '\d+'],
        methods: ['GET']
    )]
    public function fileUrl(int $id, int $fileId): JsonResponse
    {
        $report = $this->reports->find($id);
        $file = $this->entityManager->getRepository(ExchangeReportFile::class)->find($fileId);
        if (null === $report || null === $file || $file->getReport() !== $report || !$this->canSeeReport($report, $this->user())) {
            return self::private(['detail' => 'File not found.'], Response::HTTP_NOT_FOUND);
        }

        return self::private(['url' => $this->fileUrls->generate($file)]);
    }

    #[Route('/api/exchange/reports/{id}/helpful', name: 'api_exchange_report_helpful', requirements: ['id' => '\d+'], methods: ['PUT'])]
    public function helpful(
        int $id,
        Request $request,
        UserRateLimiter $rateLimiter,
        #[Target('exchange_helpful')]
        RateLimiterFactoryInterface $limiter,
    ): Response {
        $user = $this->user();
        $report = $this->reports->find($id);
        if (null === $report || $report->isUnderReview() || !$report->getDestination()->isApproved()) {
            return self::private(['detail' => 'Report not found.'], Response::HTTP_NOT_FOUND);
        }

        $payload = json_decode($request->getContent(), true);
        $part = is_array($payload) ? ($payload['part'] ?? null) : null;
        $helpful = is_array($payload) ? ($payload['helpful'] ?? null) : null;
        if (!is_string($part) || !is_bool($helpful) || !self::hasPart($report, $part)) {
            return self::private(['detail' => 'Expected {"part": "<topic or course-N>", "helpful": true|false}.'], Response::HTTP_BAD_REQUEST);
        }
        if ($report->getAuthor()?->getId() === $user->getId()) {
            return self::private(['detail' => 'You cannot mark your own report.'], Response::HTTP_FORBIDDEN);
        }

        $rateLimiter->consume($limiter, 'Slow down a little. Try again in a minute.');

        $repository = $this->entityManager->getRepository(ExchangeReportHelpful::class);
        $existing = $repository->findOneBy(['report' => $report, 'user' => $user, 'part' => $part]);
        if ($helpful && null === $existing) {
            $this->entityManager->persist(new ExchangeReportHelpful($report, $user, $part));
        } elseif (!$helpful && null !== $existing) {
            $this->entityManager->remove($existing);
        }
        $this->entityManager->flush();

        return new Response(null, Response::HTTP_NO_CONTENT);
    }

    #[Route('/api/exchange/destinations/{id}/program_suggestions', name: 'api_exchange_program_suggestions', requirements: ['id' => '\d+'], methods: ['POST'])]
    public function suggestPrograms(
        int $id,
        Request $request,
        UserRateLimiter $rateLimiter,
        #[Target('exchange_suggestion')]
        RateLimiterFactoryInterface $limiter,
    ): JsonResponse {
        $user = $this->user();
        $destination = $this->destinations->find($id);
        if (null === $destination || !$this->canSee($destination, $user)) {
            return self::private(['detail' => 'Destination not found.'], Response::HTTP_NOT_FOUND);
        }

        $payload = json_decode($request->getContent(), true);
        $add = is_array($payload) && is_array($payload['add'] ?? null) ? $payload['add'] : [];
        $remove = is_array($payload) && is_array($payload['remove'] ?? null) ? $payload['remove'] : [];
        $note = is_array($payload) && is_string($payload['note'] ?? null) ? $payload['note'] : null;
        if (null !== $note && mb_strlen($note) > 500) {
            return self::invalid('Keep the note under 500 characters.');
        }

        $listed = $destination->getPrograms();
        $changes = [];
        foreach ([ExchangeProgramSuggestion::ACTION_ADD => $add, ExchangeProgramSuggestion::ACTION_REMOVE => $remove] as $action => $codes) {
            foreach ($codes as $code) {
                $program = is_string($code) ? ExchangeProgram::tryFrom($code) : null;
                if (null === $program) {
                    return self::invalid('Unknown programme.');
                }
                $isListed = $destination->isAllPrograms() || in_array($program->value, $listed, true);
                // Adding what is there, or removing what is not, changes nothing.
                if ((ExchangeProgramSuggestion::ACTION_ADD === $action) === $isListed) {
                    continue;
                }
                $changes[] = [$program->value, $action];
            }
        }
        if ([] === $changes) {
            return self::invalid('Choose a programme to add or remove.');
        }

        $rateLimiter->consume($limiter, 'You made a lot of suggestions today. Try again tomorrow.');

        $repository = $this->entityManager->getRepository(ExchangeProgramSuggestion::class);
        foreach ($changes as [$program, $action]) {
            $existing = $repository->findOneBy(
                ['destination' => $destination, 'author' => $user, 'program' => $program, 'status' => ExchangeProgramSuggestion::STATUS_PENDING]
            );
            if (null !== $existing) {
                $this->entityManager->remove($existing);
            }
            $this->entityManager->persist((new ExchangeProgramSuggestion($destination, $user, $program, $action))->setNote($note));
        }
        $this->entityManager->flush();

        return self::private(['count' => count($changes)], Response::HTTP_CREATED);
    }

    /**
     * @param array<string, mixed> $payload
     *
     * @return ExchangeDestination|string the destination, or why it cannot be used
     */
    private function resolveDestination(array $payload, User $user, ExchangeProgram $program): ExchangeDestination|string
    {
        $id = $payload['destinationId'] ?? null;
        if (is_int($id)) {
            $destination = $this->destinations->find($id);

            return null !== $destination && $this->canSee($destination, $user) ? $destination : 'Choose a destination.';
        }

        $new = $payload['newDestination'] ?? null;
        if (!is_array($new)) {
            return 'Choose a destination, or add the one you went to.';
        }
        $name = is_string($new['name'] ?? null) ? trim($new['name']) : '';
        $city = is_string($new['city'] ?? null) ? trim($new['city']) : '';
        $country = is_string($new['country'] ?? null) ? strtoupper(trim($new['country'])) : '';
        if (mb_strlen($name) < 2 || mb_strlen($name) > 160) {
            return 'Give the name of the university.';
        }
        if ('' === $city || mb_strlen($city) > 100) {
            return 'Give the city of the university.';
        }
        if (1 !== preg_match('/^[A-Z]{2}$/', $country)) {
            return 'Choose the country of the university.';
        }

        // Someone may have added it already, or it is on the list under the same name.
        $existing = $this->destinations->findOneByNameInsensitive($name);
        if (null !== $existing) {
            return $this->canSee($existing, $user) ? $existing : 'Someone already added this university; it is waiting for a moderator. Try again later.';
        }

        $destination = (new ExchangeDestination())
            ->setName($name)
            ->setCity($city)
            ->setCountry($country)
            // Someone in this programme went there, so it is open to it.
            ->setPrograms([$program->value])
            ->setSource(ExchangeDestination::SOURCE_STUDENT)
            ->setApproved($this->isGranted(User::ROLE_MODERATOR))
            ->setSuggestedBy($user);
        $this->entityManager->persist($destination);

        return $destination;
    }

    /**
     * @return list<array{name: string, code: string, equivalent: string, text: string}>|null null when malformed
     */
    private static function parseCourses(mixed $raw): ?array
    {
        if (!is_array($raw) || count($raw) > self::MAX_COURSES) {
            return null;
        }

        $courses = [];
        foreach ($raw as $course) {
            if (!is_array($course)) {
                return null;
            }
            $fields = [];
            foreach (['name' => 200, 'code' => 40, 'equivalent' => 200, 'text' => 2000] as $field => $max) {
                $value = $course[$field] ?? '';
                if (!is_string($value) || mb_strlen($value) > $max) {
                    return null;
                }
                $fields[$field] = trim($value);
            }
            // A row left empty in the form is no course.
            if ('' === $fields['name']) {
                if ('' !== $fields['code'] . $fields['equivalent'] . $fields['text']) {
                    return null;
                }
                continue;
            }
            $courses[] = $fields;
        }

        return $courses;
    }

    /** "2024 - 2025", no further back than 2000 and no later than next year. */
    private static function isAcademicYear(string $value): bool
    {
        if (1 !== preg_match('/^(\d{4}) - (\d{4})$/', $value, $match)) {
            return false;
        }
        $start = (int) $match[1];

        return (int) $match[2] === $start + 1 && $start >= 2000 && $start <= (int) (new DateTimeImmutable())->format('Y') + 1;
    }

    private static function hasPart(ExchangeReport $report, string $part): bool
    {
        if (1 === preg_match('/^course-(\d+)$/', $part, $match)) {
            return (int) $match[1] < count($report->getCourses());
        }

        return null !== ($topic = ExchangeTopic::tryFrom($part)) && null !== $report->getSection($topic);
    }

    private function canSee(ExchangeDestination $destination, User $user): bool
    {
        return $destination->isApproved()
            || $destination->getSuggestedBy()?->getId() === $user->getId()
            || $this->isGranted(User::ROLE_MODERATOR);
    }

    private function canSeeReport(ExchangeReport $report, User $user): bool
    {
        return (!$report->isUnderReview() && $report->getDestination()->isApproved())
            || $report->getAuthor()?->getId() === $user->getId()
            || $this->isGranted(User::ROLE_MODERATOR);
    }

    /**
     * @param array<int, array{count: int, lastYear: string}> $summary
     *
     * @return array<string, mixed>
     */
    private function serializeDestination(ExchangeDestination $destination, array $summary): array
    {
        $own = $summary[(int) $destination->getId()] ?? null;

        return [
            'id' => $destination->getId(),
            'name' => $destination->getName(),
            'city' => $destination->getCity(),
            'country' => $destination->getCountry(),
            'scheme' => $destination->scheme(),
            'programs' => $destination->getPrograms(),
            'allPrograms' => $destination->isAllPrograms(),
            'source' => $destination->getSource(),
            'approved' => $destination->isApproved(),
            'reportCount' => $own['count'] ?? 0,
            'lastYear' => $own['lastYear'] ?? null,
        ];
    }

    /**
     * @param array{counts: array<int, array<string, int>>, mine: array<int, list<string>>} $helpful
     *
     * @return array<string, mixed>
     */
    private function serializeReport(ExchangeReport $report, User $user, array $helpful): array
    {
        $author = $report->getAuthor();
        $id = (int) $report->getId();

        return [
            'id' => $id,
            'academicYear' => $report->getAcademicYear(),
            'phase' => $report->getPhase(),
            'period' => $report->getPeriod(),
            'program' => $report->getProgram(),
            'sections' => (object) $report->getSections(),
            'courses' => $report->getCourses(),
            'files' => array_map(
                static fn (ExchangeReportFile $file): array => [
                    'id' => $file->getId(),
                    'name' => $file->getOriginalName(),
                    'extension' => $file->getExtension(),
                    'size' => $file->getSize(),
                ],
                $report->getFiles()->getValues()
            ),
            'author' => $report->displayName(),
            'contactEmail' => $report->contactEmail(),
            'helpful' => (object) ($helpful['counts'][$id] ?? []),
            'myHelpful' => $helpful['mine'][$id] ?? [],
            'mine' => null !== $author && $author->getId() === $user->getId(),
            'underReview' => $report->isUnderReview(),
            'createdAt' => $report->getCreatedAt()->format(DATE_ATOM),
        ];
    }

    private static function excerpt(string $text): string
    {
        $text = trim((string) preg_replace('/\s+/u', ' ', $text));

        return mb_strlen($text) > self::EXCERPT_LENGTH ? rtrim(mb_substr($text, 0, self::EXCERPT_LENGTH - 1)) . '…' : $text;
    }

    private function user(): User
    {
        $user = $this->getUser();
        assert($user instanceof User);

        return $user;
    }

    private static function invalid(string $detail, ?string $reason = null): JsonResponse
    {
        return self::private(['detail' => $detail] + (null !== $reason ? ['reason' => $reason] : []), Response::HTTP_UNPROCESSABLE_ENTITY);
    }

    /**
     * Per user: never kept by a proxy or the browser's HTTP cache.
     *
     * @param array<string, mixed> $data
     */
    private static function private(array $data, int $status = Response::HTTP_OK): JsonResponse
    {
        $response = new JsonResponse($data, $status);
        $response->headers->set('Cache-Control', 'private, no-store');

        return $response;
    }
}
