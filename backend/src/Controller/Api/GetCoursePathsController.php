<?php

namespace App\Controller\Api;

use App\Repository\CourseRepository;
use App\Serializer\CurriculumPathNormalizer;
use App\Service\CurriculumPathResolver;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Every place a course appears in the curriculum: for each one, the program and the chain of
 * modules leading down to the module that teaches it.
 *
 * A course page is usually reached from a search, a favourite or a shared link, none of which
 * carry the branch the reader came through. Without it the page cannot say which programme and
 * semester the course belongs to, and the folder tree has no branch to open.
 */
class GetCoursePathsController extends AbstractController
{
    public function __construct(
        private readonly CourseRepository $courseRepository,
        private readonly CurriculumPathResolver $pathResolver,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        // The operation reads nothing, so the course is looked up here rather than through the
        // state provider: the DTO it would build is thrown away anyway.
        $id = $request->attributes->get('id');
        $course = is_scalar($id) ? $this->courseRepository->find($id) : null;
        if ($course === null) {
            throw new NotFoundHttpException('Course not found.');
        }

        $paths = array_map(
            CurriculumPathNormalizer::normalize(...),
            $this->pathResolver->resolveCourse($course)
        );

        return new JsonResponse(['paths' => array_values($paths)]);
    }
}
