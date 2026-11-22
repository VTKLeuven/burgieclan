<?php

namespace App\Controller\Api;

use App\Constants\AthensTopic;
use App\Constants\ExchangeProgram;
use App\Entity\AthensCourse;
use App\Entity\AthensCourseInterest;
use App\Entity\AthensReview;
use App\Entity\AthensUniversity;
use App\Entity\ExchangeDestination;
use App\Entity\User;
use App\Repository\AthensCourseRepository;
use App\Repository\AthensReviewRepository;
use App\Service\Exchange\AthensCatalogue;
use App\Service\RateLimit\UserRateLimiter;
use DateTimeImmutable;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Target;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * The ATHENS tab of the exchange pages: the courses of the faculty's catalogue, reviews of them,
 * and each student's private stars. Behind the EXCHANGE feature (route names `api_exchange_`).
 *
 * - GET /api/exchange/athens: {"edition", "published", "source", "sessions", "universities",
 *   "courses", "recent"}: the courses of the current catalogue only, each with its number of
 *   approved reviews, their average score and the reader's own stars ("myStars").
 * - GET /api/exchange/athens/courses/{id}: {"course", "university", "reviews", "siblings",
 *   "elsewhere"}; also for a course no longer in the catalogue ("active": false).
 * - POST /api/exchange/athens/reviews {"courseId", "session": "2025-11", "program", "rating": 1-5,
 *   "sections", "contactable", "showName"}: under review until a moderator approves it. One per
 *   student per course. 201 {"id", "courseId"}, or 422 {"detail"}.
 * - DELETE /api/exchange/athens/reviews/{id}: by its author or a moderator. 204.
 * - PUT /api/exchange/athens/courses/{id}/stars {"stars": 1-5 | null}: how much the reader would
 *   like to take it. Never shown to anyone else. 204.
 */
#[IsGranted(User::ROLE_USER)]
class AthensController extends AbstractController
{
    public const MAX_SECTION_LENGTH = 3000;
    private const RECENT = 3;
    private const ELSEWHERE = 6;
    private const EXCERPT_LENGTH = 280;

    public function __construct(
        private readonly AthensCourseRepository $courses,
        private readonly AthensReviewRepository $reviews,
        private readonly AthensCatalogue $catalogue,
        private readonly EntityManagerInterface $entityManager,
    ) {}

    #[Route('/api/exchange/athens', name: 'api_exchange_athens_overview', methods: ['GET'])]
    public function overview(): JsonResponse
    {
        $user = $this->user();
        $catalogue = $this->catalogue->read();
        $summary = $this->reviews->summaryPerCourse();
        $stars = $this->starsOf($user);
        $courses = $this->courses->findActive();

        $universities = [];
        foreach ($courses as $course) {
            $universities[(int) $course->getUniversity()->getId()] = $course->getUniversity();
        }
        $erasmus = $this->erasmusDestinations();

        $recent = [];
        foreach ($this->reviews->findLatestApproved(self::RECENT) as $review) {
            $sections = $review->getSections();
            uasort($sections, static fn (string $a, string $b): int => mb_strlen($b) <=> mb_strlen($a));
            $topic = array_key_first($sections);
            if (null === $topic) {
                continue;
            }
            $recent[] = [
                'reviewId' => $review->getId(),
                'course' => ['id' => $review->getCourse()->getId(), 'code' => $review->getCourse()->getCode(), 'title' => $review->getCourse()->getTitle()],
                'university' => $review->getCourse()->getUniversity()->getName(),
                'topic' => $topic,
                'excerpt' => self::excerpt($sections[$topic]),
                'session' => $review->getSession(),
                'program' => $review->getProgram(),
                'rating' => $review->getRating(),
            ];
        }

        return self::private(
            [
            'edition' => $catalogue['edition'],
            'published' => $catalogue['published'],
            'source' => $catalogue['source'],
            'sessions' => $catalogue['sessions'],
            'universities' => array_values(
                array_map(
                    fn (AthensUniversity $university): array => $this->serializeUniversity($university, $erasmus),
                    $universities
                )
            ),
            'courses' => array_map(
                fn (AthensCourse $course): array => $this->serializeCourse($course, $summary, $stars),
                $courses
            ),
            'recent' => $recent,
            ]
        );
    }

    #[Route('/api/exchange/athens/courses/{id}', name: 'api_exchange_athens_course', requirements: ['id' => '\d+'], methods: ['GET'])]
    public function course(int $id): JsonResponse
    {
        $user = $this->user();
        $course = $this->courses->find($id);
        if (null === $course) {
            return self::private(['detail' => 'Course not found.'], Response::HTTP_NOT_FOUND);
        }
        $university = $course->getUniversity();
        $summary = $this->reviews->summaryPerCourse();
        $stars = $this->starsOf($user);

        // What students of the university's other courses wrote about the city and the practical side.
        $elsewhere = [];
        foreach ($this->reviews->findApprovedAtUniversity($university, $course, self::ELSEWHERE * 3) as $review) {
            $sections = array_intersect_key($review->getSections(), [AthensTopic::CITY->value => true, AthensTopic::PRACTICAL->value => true]);
            if ([] === $sections || count($elsewhere) >= self::ELSEWHERE) {
                continue;
            }
            $elsewhere[] = [
                'reviewId' => $review->getId(),
                'course' => ['id' => $review->getCourse()->getId(), 'title' => $review->getCourse()->getTitle(), 'active' => $review->getCourse()->isActive()],
                'session' => $review->getSession(),
                'program' => $review->getProgram(),
                'sections' => $sections,
            ];
        }

        return self::private(
            [
            'course' => $this->serializeCourse($course, $summary, $stars) + [
                'active' => $course->isActive(),
                'firstEdition' => $course->getFirstEdition(),
                'lastEdition' => $course->getLastEdition(),
            ],
            'university' => $this->serializeUniversity($university, $this->erasmusDestinations()),
            'reviews' => array_map(
                fn (AthensReview $review): array => $this->serializeReview($review, $user),
                $this->reviews->findForCourse($course, $user)
            ),
            'siblings' => array_map(
                fn (AthensCourse $other): array => $this->serializeCourse($other, $summary, $stars),
                $this->courses->findActiveAt($university, $course)
            ),
            'elsewhere' => $elsewhere,
            ]
        );
    }

    #[Route('/api/exchange/athens/reviews', name: 'api_exchange_athens_review_create', methods: ['POST'])]
    public function create(
        Request $request,
        UserRateLimiter $rateLimiter,
        #[Target('athens_review')]
        RateLimiterFactoryInterface $limiter,
    ): JsonResponse {
        $user = $this->user();
        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            return self::invalid('Expected a JSON object.');
        }

        $courseId = $payload['courseId'] ?? null;
        $course = is_int($courseId) ? $this->courses->find($courseId) : null;
        if (null === $course) {
            return self::invalid('Choose the course you took.');
        }
        $session = $payload['session'] ?? null;
        if (!is_string($session) || !self::isPastSession($session)) {
            return self::invalid('Choose the ATHENS session you took part in.');
        }
        $program = is_string($payload['program'] ?? null) ? ExchangeProgram::tryFrom($payload['program']) : null;
        if (null === $program) {
            return self::invalid('Choose your programme.');
        }
        $rating = $payload['rating'] ?? null;
        if (!is_int($rating) || $rating < AthensReview::MIN_RATING || $rating > AthensReview::MAX_RATING) {
            return self::invalid('Give the course a score from 1 to 5.');
        }

        $rawSections = $payload['sections'] ?? [];
        if (!is_array($rawSections)) {
            return self::invalid('Expected "sections" as an object of texts per topic.');
        }
        $sections = [];
        foreach (AthensTopic::cases() as $topic) {
            $text = $rawSections[$topic->value] ?? '';
            if (!is_string($text)) {
                return self::invalid('Expected text for every topic.');
            }
            if (mb_strlen($text) > self::MAX_SECTION_LENGTH) {
                return self::invalid(sprintf('Keep each topic under %d characters.', self::MAX_SECTION_LENGTH));
            }
            $sections[$topic->value] = $text;
        }
        if ('' === trim(implode('', $sections))) {
            return self::invalid('Write about at least one topic.');
        }

        if (null !== $this->reviews->findOneBy(['course' => $course, 'author' => $user])) {
            return self::invalid('You already reviewed this course. Delete that review to write a new one.');
        }

        $rateLimiter->consume($limiter, 'You shared a lot of reviews today. Try again tomorrow.');

        $review = (new AthensReview($course, $user))
            ->setSession($session)
            ->setProgram($program->value)
            ->setRating($rating)
            ->setSections($sections)
            ->setContactable(true === ($payload['contactable'] ?? false))
            ->setShowName(true === ($payload['showName'] ?? false));
        $this->entityManager->persist($review);
        $this->entityManager->flush();

        return self::private(['id' => $review->getId(), 'courseId' => $course->getId()], Response::HTTP_CREATED);
    }

    #[Route('/api/exchange/athens/reviews/{id}', name: 'api_exchange_athens_review_delete', requirements: ['id' => '\d+'], methods: ['DELETE'])]
    public function delete(int $id): Response
    {
        $user = $this->user();
        $review = $this->reviews->find($id);
        $mine = null !== $review && $review->getAuthor()?->getId() === $user->getId();
        if (null === $review || (!$mine && $review->isUnderReview() && !$this->isGranted(User::ROLE_MODERATOR))) {
            return self::private(['detail' => 'Review not found.'], Response::HTTP_NOT_FOUND);
        }
        if (!$mine && !$this->isGranted(User::ROLE_MODERATOR)) {
            return self::private(['detail' => 'Only its author can delete a review.'], Response::HTTP_FORBIDDEN);
        }

        $this->entityManager->remove($review);
        $this->entityManager->flush();

        return new Response(null, Response::HTTP_NO_CONTENT);
    }

    #[Route('/api/exchange/athens/courses/{id}/stars', name: 'api_exchange_athens_stars', requirements: ['id' => '\d+'], methods: ['PUT'])]
    public function stars(
        int $id,
        Request $request,
        UserRateLimiter $rateLimiter,
        #[Target('athens_stars')]
        RateLimiterFactoryInterface $limiter,
    ): Response {
        $user = $this->user();
        $course = $this->courses->find($id);
        if (null === $course) {
            return self::private(['detail' => 'Course not found.'], Response::HTTP_NOT_FOUND);
        }

        $payload = json_decode($request->getContent(), true);
        $stars = is_array($payload) && array_key_exists('stars', $payload) ? $payload['stars'] : false;
        if (null !== $stars && (!is_int($stars) || $stars < 1 || $stars > 5)) {
            return self::private(['detail' => 'Expected {"stars": 1-5 or null}.'], Response::HTTP_BAD_REQUEST);
        }

        $rateLimiter->consume($limiter, 'Slow down a little. Try again in a minute.');

        $repository = $this->entityManager->getRepository(AthensCourseInterest::class);
        $existing = $repository->findOneBy(['user' => $user, 'course' => $course]);
        if (null === $stars) {
            if (null !== $existing) {
                $this->entityManager->remove($existing);
            }
        } elseif (null === $existing) {
            $this->entityManager->persist(new AthensCourseInterest($user, $course, $stars));
        } else {
            $existing->setStars($stars);
        }
        $this->entityManager->flush();

        return new Response(null, Response::HTTP_NO_CONTENT);
    }

    /** @return array<int, int> course id => stars */
    private function starsOf(User $user): array
    {
        $rows = $this->entityManager->createQueryBuilder()
            ->select('IDENTITY(i.course) AS course', 'i.stars')
            ->from(AthensCourseInterest::class, 'i')
            ->andWhere('i.user = :user')
            ->setParameter('user', $user)
            ->getQuery()
            ->getArrayResult();

        $stars = [];
        foreach ($rows as $row) {
            $stars[(int) $row['course']] = (int) $row['stars'];
        }

        return $stars;
    }

    /**
     * Approved exchange destinations by lower-case name, so a university that is also an Erasmus
     * partner links to what students wrote about a semester there.
     *
     * @return array<string, int>
     */
    private function erasmusDestinations(): array
    {
        $rows = $this->entityManager->createQueryBuilder()
            ->select('d.id', 'd.name')
            ->from(ExchangeDestination::class, 'd')
            ->andWhere('d.approved = true')
            ->getQuery()
            ->getArrayResult();

        $byName = [];
        foreach ($rows as $row) {
            $byName[mb_strtolower((string) $row['name'])] = (int) $row['id'];
        }

        return $byName;
    }

    /**
     * "2025-11" or "2026-03": a November or March session that has started, not before 2000.
     */
    private static function isPastSession(string $session): bool
    {
        if (1 !== preg_match('/^(\d{4})-(03|11)$/', $session, $match) || (int) $match[1] < 2000) {
            return false;
        }

        return new DateTimeImmutable($session . '-01') <= new DateTimeImmutable('today');
    }

    /**
     * @param array<string, int> $erasmus
     *
     * @return array<string, mixed>
     */
    private function serializeUniversity(AthensUniversity $university, array $erasmus): array
    {
        return [
            'id' => $university->getId(),
            'name' => $university->getName(),
            'city' => $university->getCity(),
            'country' => $university->getCountry(),
            'erasmusDestinationId' => $erasmus[mb_strtolower($university->getName())] ?? null,
        ];
    }

    /**
     * @param array<int, array{count: int, rating: float}> $summary
     * @param array<int, int>                             $stars
     *
     * @return array<string, mixed>
     */
    private function serializeCourse(AthensCourse $course, array $summary, array $stars): array
    {
        $id = (int) $course->getId();

        return [
            'id' => $id,
            'code' => $course->getCode(),
            'title' => $course->getTitle(),
            'evaluation' => $course->getEvaluation(),
            'programs' => $course->getPrograms(),
            'universityId' => $course->getUniversity()->getId(),
            'reviewCount' => $summary[$id]['count'] ?? 0,
            'rating' => $summary[$id]['rating'] ?? null,
            'myStars' => $stars[$id] ?? null,
        ];
    }

    /** @return array<string, mixed> */
    private function serializeReview(AthensReview $review, User $user): array
    {
        return [
            'id' => $review->getId(),
            'session' => $review->getSession(),
            'program' => $review->getProgram(),
            'rating' => $review->getRating(),
            'sections' => (object) $review->getSections(),
            'author' => $review->displayName(),
            'contactEmail' => $review->contactEmail(),
            'mine' => $review->getAuthor()?->getId() === $user->getId(),
            'underReview' => $review->isUnderReview(),
            'createdAt' => $review->getCreatedAt()->format(DATE_ATOM),
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

    private static function invalid(string $detail): JsonResponse
    {
        return self::private(['detail' => $detail], Response::HTTP_UNPROCESSABLE_ENTITY);
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
