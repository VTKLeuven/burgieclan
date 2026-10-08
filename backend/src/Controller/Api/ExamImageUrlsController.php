<?php

namespace App\Controller\Api;

use App\Repository\ExamImageRepository;
use App\Repository\ExamRepository;
use App\Security\Voter\CollabDocumentVoter;
use App\Service\Exam\ExamImageUrlGenerator;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

/**
 * GET /api/exams/{id}/image-urls: short-lived links to every image in a reconstruction, by UUID,
 * for whoever may see it. The page asks once for all of them rather than once per image.
 *
 *     {"images": {"<uuid>": {"url": "...", "width": 640, "height": 480}, "<uuid>": {"removed": true}}}
 *
 * Links expire after ExamImageUrlGenerator::TTL_MINUTES; an image that fails to load after that
 * asks again.
 */
class ExamImageUrlsController extends AbstractController
{
    #[Route('/api/exams/{id}/image-urls', name: 'api_exam_image_urls', requirements: ['id' => '\d+'], methods: ['GET'])]
    public function __invoke(
        int $id,
        ExamRepository $exams,
        ExamImageRepository $images,
        ExamImageUrlGenerator $urls,
    ): JsonResponse {
        $exam = $exams->find($id);
        if (null === $exam || !$this->isGranted(CollabDocumentVoter::VIEW, $exam->getDocumentName())) {
            return new JsonResponse(['title' => 'Not Found', 'detail' => 'Exam reconstruction not found.'], 404);
        }

        $links = [];
        foreach ($images->findForExam($exam) as $image) {
            $links[$image->getUuid()] = $image->isRemoved()
                ? ['removed' => true]
                : ['url' => $urls->generate($image), 'width' => $image->getWidth(), 'height' => $image->getHeight()];
        }

        // An empty list must stay a JSON object, not [].
        $response = new JsonResponse(['images' => (object) $links]);
        // Every response is a fresh set of credentials; nothing may keep or share it.
        $response->headers->set('Cache-Control', 'no-store, private');

        return $response;
    }
}
