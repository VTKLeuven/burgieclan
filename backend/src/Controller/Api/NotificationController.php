<?php

namespace App\Controller\Api;

use App\Constants\Feature;
use App\Entity\Course;
use App\Entity\Notification;
use App\Entity\User;
use App\Repository\NotificationRepository;
use App\Service\Feature\FeatureFlags;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * The signed-in user's notifications about the courses they follow (CourseNotifier).
 *
 * - GET /api/notifications: {"unreadCount", "mutedCourseIds", "items"}, newest first, at most
 *   LIMIT. Clears out notifications older than NotificationRepository::KEEP_FOR on the way.
 * - POST /api/notifications/read: marks them all as read. 204.
 * - PUT /api/notifications/muted_courses/{id} {"muted": bool}: switches the notifications of
 *   one course off or back on. 204.
 */
#[IsGranted(User::ROLE_USER)]
class NotificationController extends AbstractController
{
    public const LIMIT = 50;
    private const EXCERPT_LENGTH = 140;

    public function __construct(
        private readonly NotificationRepository $notifications,
        private readonly EntityManagerInterface $entityManager,
        private readonly FeatureFlags $features,
    ) {}

    #[Route('/api/notifications', name: 'api_notifications', methods: ['GET'])]
    public function list(): JsonResponse
    {
        $user = $this->user();
        $includeExams = $this->features->isEnabled(Feature::EXAM_RECONSTRUCTIONS);

        $this->notifications->pruneFor($user);

        return self::private(
            [
            'unreadCount' => $this->notifications->countUnreadFor($user, $includeExams),
            'mutedCourseIds' => array_values(
                array_map(
                    static fn (Course $course): ?int => $course->getId(),
                    $user->getMutedCourses()->toArray()
                )
            ),
            'items' => array_map(
                fn (Notification $notification): array => $this->serialize($notification),
                $this->notifications->findLatestFor($user, $includeExams, self::LIMIT)
            ),
            ]
        );
    }

    #[Route('/api/notifications/read', name: 'api_notifications_read', methods: ['POST'])]
    public function markRead(): Response
    {
        $this->notifications->markAllReadFor($this->user());

        return new Response(null, Response::HTTP_NO_CONTENT);
    }

    #[Route(
        '/api/notifications/muted_courses/{id}',
        name: 'api_notifications_muted_course',
        requirements: ['id' => '\d+'],
        methods: ['PUT']
    )]
    public function mute(int $id, Request $request): Response
    {
        $payload = json_decode($request->getContent(), true);
        $muted = is_array($payload) ? ($payload['muted'] ?? null) : null;
        if (!is_bool($muted)) {
            return self::private(['detail' => 'Expected {"muted": true|false}.'], Response::HTTP_BAD_REQUEST);
        }

        $course = $this->entityManager->find(Course::class, $id);
        if (null === $course) {
            return self::private(['detail' => 'Course not found.'], Response::HTTP_NOT_FOUND);
        }

        $user = $this->user();
        $muted ? $user->muteCourse($course) : $user->unmuteCourse($course);
        $this->entityManager->flush();

        return new Response(null, Response::HTTP_NO_CONTENT);
    }

    /**
     * @return array<string, mixed>
     */
    private function serialize(Notification $notification): array
    {
        $course = $notification->getCourse();
        $document = $notification->getDocument();
        $exam = $notification->getExam();
        $comment = $notification->getCourseComment();

        return [
            'id' => $notification->getId(),
            'type' => $notification->getType()->value,
            'count' => $notification->getCount(),
            'read' => $notification->isRead(),
            'createdAt' => $notification->getCreatedAt()->format(DATE_ATOM),
            'updatedAt' => $notification->getUpdatedAt()->format(DATE_ATOM),
            'course' => [
                'id' => $course->getId(),
                'code' => $course->getCode(),
                'name' => $course->getName(),
                'nameNl' => $course->getNameNl(),
                'nameEn' => $course->getNameEn(),
            ],
            'document' => null === $document ? null : [
                'id' => $document->getId(),
                'name' => $document->getName(),
            ],
            'exam' => null === $exam ? null : [
                'id' => $exam->getId(),
                'academicYear' => $exam->getAcademicYear(),
                'period' => $exam->getPeriod()->value,
            ],
            'comment' => null === $comment ? null : [
                'id' => $comment->getId(),
                'excerpt' => self::excerpt($comment->getContent()),
            ],
        ];
    }

    private static function excerpt(string $content): string
    {
        $text = trim((string) preg_replace('/\s+/u', ' ', html_entity_decode(strip_tags($content))));

        return mb_strlen($text) > self::EXCERPT_LENGTH
            ? rtrim(mb_substr($text, 0, self::EXCERPT_LENGTH - 1)) . '…'
            : $text;
    }

    private function user(): User
    {
        $user = $this->getUser();
        assert($user instanceof User);

        return $user;
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
