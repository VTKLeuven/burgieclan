<?php

namespace App\Controller\Api;

use App\Constants\AcademicYear;
use App\Entity\Course;
use App\Entity\CourseComment;
use App\Entity\Document;
use App\Entity\User;
use App\Repository\CommentCategoryRepository;
use App\Repository\CourseCommentRepository;
use App\Repository\CourseRatingRepository;
use App\Repository\CourseRepository;
use App\Repository\DocumentRepository;
use App\Security\Voter\DocumentFileVoter;
use App\Service\DocumentFileUrlGenerator;
use Doctrine\ORM\EntityManagerInterface;
use League\Flysystem\FilesystemException;
use League\Flysystem\FilesystemOperator;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Burgieclan in the VTK app: your courses, their documents and evaluations, and a link to
 * open a document.
 *
 * The app never talks to Burgieclan itself. It talks to vtk.be with its session cookie, and vtk.be
 * calls these routes for the member with a signed X-Vtk-User header (VtkServiceAuthenticator),
 * exactly like the study planner. So these routes are the whole surface a leaked service secret
 * opens beyond the planner, and they are kept small on purpose:
 *
 * - reading: courses, approved documents (plus the member's own ones under review, as on the
 *   site), the course evaluations (stars and comments), and a short-lived link to a file the
 *   member may open (DocumentFileVoter);
 * - one write: marking a course as a favourite, the same list as "My courses" on the site.
 *
 * Uploading, voting, comments and moderation stay on burgieclan.vtk.be; the app links there.
 *
 *     GET    /api/vtk_app/courses                -> {"courses": [course...]} (favourites)
 *     GET    /api/vtk_app/courses/search?q=...    -> {"courses": [course...]}
 *     GET    /api/vtk_app/courses/{id}            -> {"course": course, "documents": [...]}
 *     PUT    /api/vtk_app/courses/{id}/favorite   -> {"course": course}
 *     DELETE /api/vtk_app/courses/{id}/favorite   -> {"course": course}
 *     GET    /api/vtk_app/documents/{id}/file-url -> {"url": "...", "expiresInMinutes": 10}
 */
#[IsGranted(User::ROLE_USER)]
final class VtkAppController extends AbstractController
{
    /** Search needs a few characters: one letter matches half the catalogue. */
    private const MIN_QUERY = 2;
    private const SEARCH_LIMIT = 25;

    public function __construct(
        private readonly CourseRepository $courses,
        private readonly CourseRatingRepository $ratings,
        private readonly CourseCommentRepository $comments,
        private readonly CommentCategoryRepository $categories,
        private readonly DocumentRepository $documents,
        private readonly EntityManagerInterface $entityManager,
        private readonly DocumentFileUrlGenerator $fileUrlGenerator,
        #[Autowire(service: 'default.storage')]
        private readonly FilesystemOperator $documentStorage,
    ) {}

    #[Route('/api/vtk_app/courses', name: 'api_vtk_app_courses', methods: ['GET'])]
    public function favourites(Request $request): JsonResponse
    {
        $user = $this->user();
        $courses = $user->getFavoriteCourses()->toArray();
        usort($courses, static fn (Course $a, Course $b) => strcmp($a->getName(), $b->getName()));

        return $this->courseList($courses, $user, self::lang($request));
    }

    #[Route('/api/vtk_app/courses/search', name: 'api_vtk_app_course_search', methods: ['GET'])]
    public function search(Request $request): JsonResponse
    {
        $query = trim((string) $request->query->get('q', ''));
        if (mb_strlen($query) < self::MIN_QUERY) {
            return self::private(['courses' => []]);
        }

        return $this->courseList(
            $this->courses->findBySearchQuery(mb_substr($query, 0, 100), self::SEARCH_LIMIT),
            $this->user(),
            self::lang($request),
        );
    }

    #[Route('/api/vtk_app/courses/{id}', name: 'api_vtk_app_course', requirements: ['id' => '\d+'], methods: ['GET'])]
    public function course(int $id, Request $request): JsonResponse
    {
        $course = $this->courses->find($id);
        if (null === $course) {
            return self::notFound();
        }
        $user = $this->user();
        $lang = self::lang($request);

        return self::private(
            [
            'course' => $this->normalizeCourse($course, $user, $lang, $this->documents->countPublishedForCourses([$course])[$course->getId()] ?? 0),
            'documents' => array_map(
                fn (Document $document) => $this->normalizeDocument($document, $user, $lang),
                $this->visibleDocuments($course, $user),
            ),
            'evaluations' => $this->evaluations($course, $lang),
            ]
        );
    }

    #[Route('/api/vtk_app/courses/{id}/favorite', name: 'api_vtk_app_course_favorite', requirements: ['id' => '\d+'], methods: ['PUT', 'DELETE'])]
    public function favourite(int $id, Request $request): JsonResponse
    {
        $course = $this->courses->find($id);
        if (null === $course) {
            return self::notFound();
        }
        $user = $this->user();
        if ('PUT' === $request->getMethod()) {
            $user->addFavoriteCourse($course);
        } else {
            $user->removeFavoriteCourse($course);
        }
        $this->entityManager->flush();

        return self::private(
            [
            'course' => $this->normalizeCourse($course, $user, self::lang($request), $this->documents->countPublishedForCourses([$course])[$course->getId()] ?? 0),
            ]
        );
    }

    #[Route('/api/vtk_app/documents/{id}/file-url', name: 'api_vtk_app_document_file', requirements: ['id' => '\d+'], methods: ['GET'])]
    public function fileUrl(int $id, Request $request): JsonResponse
    {
        $document = $this->documents->find($id);
        $filename = $document?->getFileName();
        // A document the member may not see answers exactly like a missing one, as on the site.
        if (null === $document || null === $filename || !$this->isGranted(DocumentFileVoter::VIEW_FILE, $document)) {
            return self::notFound();
        }
        try {
            if (!$this->documentStorage->fileExists($filename)) {
                return self::notFound();
            }
        } catch (FilesystemException) {
            return self::notFound();
        }

        $url = $this->fileUrlGenerator->generate($document, true);
        // Local storage hands out a path; vtk.be passes this to a phone, which needs the host.
        if (str_starts_with($url, '/')) {
            $url = $request->getSchemeAndHttpHost() . $url;
        }

        return self::private(['url' => $url, 'expiresInMinutes' => DocumentFileUrlGenerator::TTL_MINUTES]);
    }

    /**
     * The course evaluations as the course page shows them: per section the average stars
     * (recent years and all time, null below the minimum number of ratings, as on the site)
     * and the comments, newest first. Read only: rating and commenting stay on Burgieclan.
     *
     * @return array<string, mixed>
     */
    private function evaluations(Course $course, string $lang): array
    {
        $recentYears = AcademicYear::mostRecent(GetCourseRatingSummaryController::RECENT_YEARS);
        $recent = $this->ratings->summaryForCourse($course, $recentYears);
        $allTime = $this->ratings->summaryForCourse($course);
        $empty = ['average' => null, 'count' => 0];

        /** @var CourseComment[] $comments */
        $comments = $this->comments->findBy(['course' => $course], ['createdAt' => 'DESC'], 200);
        $byCategory = [];
        foreach ($comments as $comment) {
            $byCategory[$comment->getCategory()->getId()][] = [
                'id' => $comment->getId(),
                'content' => $comment->getContent(),
                'year' => $comment->getAcademicYear(),
                'author' => $comment->isAnonymous() ? null : $comment->getCreator()->getFullName(),
                'createdAt' => $comment->getCreatedAt()->format(DATE_ATOM),
                'score' => $comment->getVoteScore(),
            ];
        }

        $sections = [];
        foreach ($this->categories->findBy([], ['id' => 'ASC']) as $category) {
            $id = $category->getId();
            $rated = $category->isRated();
            // A discussion section nobody wrote in says nothing; a rated one still shows its stars.
            if (!$rated && !isset($byCategory[$id])) {
                continue;
            }
            $sections[] = [
                'id' => $id,
                'name' => $category->getName($lang) ?? $category->getNameNl(),
                'description' => $category->getDescription($lang),
                'rated' => $rated,
                'lowLabel' => $rated ? $category->getRatingLowLabel($lang) : null,
                'highLabel' => $rated ? $category->getRatingHighLabel($lang) : null,
                'recent' => $recent[$id] ?? $empty,
                'allTime' => $allTime[$id] ?? $empty,
                'comments' => $byCategory[$id] ?? [],
            ];
        }

        return ['recentYears' => $recentYears, 'sections' => $sections];
    }

    /**
     * The documents of a course as its page on the site lists them: the course's own, plus those
     * of identical courses (one course under several codes), each migrated file once. Approved
     * ones for everyone; one still under review only for its uploader.
     *
     * @return Document[]
     */
    private function visibleDocuments(Course $course, User $user): array
    {
        $courses = [$course, ...$course->getIdenticalCourses()->toArray()];
        /** @var Document[] $rows */
        $rows = $this->documents->createQueryBuilder('d')
            ->andWhere('d.course IN (:courses)')
            ->andWhere('d.under_review = false OR d.creator = :user')
            ->setParameter('courses', $courses)
            ->setParameter('user', $user)
            ->orderBy('d.year', 'DESC')
            ->addOrderBy('d.name', 'ASC')
            ->getQuery()
            ->getResult();

        $seen = [];
        $documents = [];
        // The course's own documents first, so a file on both keeps the course's own row.
        usort($rows, static fn (Document $a, Document $b) => (int) ($a->getCourse() !== $course) <=> (int) ($b->getCourse() !== $course));
        foreach ($rows as $document) {
            $seafile = $document->getSeafileFileId();
            if (null !== $seafile) {
                if (isset($seen[$seafile])) {
                    continue;
                }
                $seen[$seafile] = true;
            }
            $documents[] = $document;
        }

        return $documents;
    }

    /** @param Course[] $courses */
    private function courseList(array $courses, User $user, string $lang): JsonResponse
    {
        $counts = $this->documents->countPublishedForCourses($courses);

        return self::private(
            [
            'courses' => array_map(
                fn (Course $course) => $this->normalizeCourse($course, $user, $lang, $counts[$course->getId()] ?? 0),
                $courses,
            ),
            ]
        );
    }

    /** @return array<string, mixed> */
    private function normalizeCourse(Course $course, User $user, string $lang, int $documentCount): array
    {
        $name = 'en' === $lang ? ($course->getNameEn() ?? $course->getName()) : ($course->getNameNl() ?? $course->getName());

        return [
            'id' => $course->getId(),
            'code' => $course->getCode(),
            'name' => $name,
            'credits' => $course->getCredits(),
            'semesters' => array_values($course->getSemesters()),
            'professors' => array_values($course->getProfessors()),
            'language' => $course->getLanguage(),
            'documentCount' => $documentCount,
            'favorite' => $user->getFavoriteCourses()->contains($course),
        ];
    }

    /** @return array<string, mixed> */
    private function normalizeDocument(Document $document, User $user, string $lang): array
    {
        $category = $document->getCategory();

        return [
            'id' => $document->getId(),
            'name' => $document->getName(),
            'category' => ['id' => $category->getId(), 'name' => $category->getName($lang) ?? $category->getNameNl()],
            'year' => $document->getYear(),
            'author' => $document->isAnonymous() ? null : $document->getAuthor(),
            'fileSize' => $document->getFileSize(),
            'hasFile' => null !== $document->getFileName(),
            'underReview' => $document->isUnderReview(),
            'mine' => $document->getCreator()->getId() === $user->getId(),
            'createdAt' => $document->getCreatedAt()->format(DATE_ATOM),
        ];
    }

    private function user(): User
    {
        $user = $this->getUser();
        assert($user instanceof User);

        return $user;
    }

    private static function lang(Request $request): string
    {
        return 'en' === $request->query->get('lang') ? 'en' : 'nl';
    }

    /** @param array<string, mixed> $data */
    private static function private(array $data, int $status = Response::HTTP_OK): JsonResponse
    {
        $response = new JsonResponse($data, $status);
        $response->headers->set('Cache-Control', 'no-store, private');

        return $response;
    }

    private static function notFound(): JsonResponse
    {
        return self::private(['detail' => 'Not found.'], Response::HTTP_NOT_FOUND);
    }
}
