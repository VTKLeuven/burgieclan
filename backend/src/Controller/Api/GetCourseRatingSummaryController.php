<?php

namespace App\Controller\Api;

use App\ApiResource\CourseRatingSummaryApi;
use App\Constants\AcademicYear;
use App\Entity\CommentCategory;
use App\Entity\Course;
use App\Entity\User;
use App\Repository\CommentCategoryRepository;
use App\Repository\CourseRatingRepository;
use App\Repository\CourseRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class GetCourseRatingSummaryController extends AbstractController
{
    /**
     * How many academic years count as "recent".
     *
     * Three because two is twitchy and five stops being recent. A course changes when the
     * professor changes or the material is rewritten, and a lifetime average buries that.
     */
    public const RECENT_YEARS = 3;

    public function __construct(
        private readonly CourseRepository $courseRepository,
        private readonly CommentCategoryRepository $commentCategoryRepository,
        private readonly CourseRatingRepository $ratingRepository,
    ) {}

    public function __invoke(Request $request): CourseRatingSummaryApi
    {
        $course = $this->courseRepository->find($request->attributes->get('id'));
        if (!$course instanceof Course) {
            throw new NotFoundHttpException('Course not found');
        }

        $recentYears = AcademicYear::mostRecent(self::RECENT_YEARS);

        // Five queries for the whole page, whatever the number of rated sections: the sections
        // themselves, the two windows, the per-year breakdown, and this user's own scores.
        $allTime = $this->ratingRepository->summaryForCourse($course);
        $recent = $this->ratingRepository->summaryForCourse($course, $recentYears);
        $byYear = $this->ratingRepository->summaryByYearForCourse($course);
        $ownRatings = $this->ownRatings($course);

        $summary = new CourseRatingSummaryApi();
        $summary->id = $course->getId();
        $summary->recentYears = $recentYears;

        $ratedCategories = $this->commentCategoryRepository->findBy(
            ['type' => CommentCategory::TYPE_RATED],
            ['id' => 'ASC']
        );

        $empty = ['average' => null, 'count' => 0];
        foreach ($ratedCategories as $category) {
            $id = $category->getId();
            // Sections nobody has rated are included: without them a course that has never been
            // rated would show no stars at all, and nobody could be the first to rate it.
            $summary->sections[] = [
                'categoryId' => $id,
                'recent' => $recent[$id] ?? $empty,
                'allTime' => $allTime[$id] ?? $empty,
                'byYear' => $byYear[$id] ?? [],
                'currentUserRating' => $ownRatings[$id] ?? null,
            ];
        }

        return $summary;
    }

    /**
     * @return array<int, int>
     */
    private function ownRatings(Course $course): array
    {
        $user = $this->getUser();

        return $user instanceof User
            ? $this->ratingRepository->findUserRatingsForCourse($course, $user)
            : [];
    }
}
