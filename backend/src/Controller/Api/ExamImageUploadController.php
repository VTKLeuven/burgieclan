<?php

namespace App\Controller\Api;

use App\Entity\ExamImage;
use App\Entity\User;
use App\Repository\ExamImageRepository;
use App\Repository\ExamRepository;
use App\Security\Voter\CollabDocumentVoter;
use App\Service\Exam\ExamImageStore;
use App\Service\Exam\ExamImageUrlGenerator;
use App\Service\Exam\InvalidExamImageException;
use App\Service\RateLimit\UserRateLimiter;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Target;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * POST /api/exams/{id}/images, multipart with the image as `file`: adds an image to an exam
 * reconstruction while it is open for editing. Answers {"uuid", "url", "width", "height"}: the
 * editor puts the UUID in the document and shows the image from `url`, a short-lived link
 * (ExamImageUrlGenerator). A refusal comes with a `reason` the page translates: "locked",
 * "missing", "size", "limit", "rate", or one from InvalidExamImageException.
 *
 * Images go live at once; moderators remove bad ones afterwards (ExamCrudController). Uploads
 * count against the exam_image_upload rate limit, and a reconstruction holds at most
 * ExamImage::MAX_PER_EXAM.
 */
#[IsGranted(User::ROLE_USER)]
class ExamImageUploadController extends AbstractController
{
    #[Route('/api/exams/{id}/images', name: 'api_exam_image_upload', requirements: ['id' => '\d+'], methods: ['POST'])]
    public function __invoke(
        int $id,
        Request $request,
        ExamRepository $exams,
        ExamImageRepository $images,
        ExamImageStore $store,
        ExamImageUrlGenerator $urls,
        UserRateLimiter $rateLimiter,
        #[Target('exam_image_upload')]
        RateLimiterFactoryInterface $uploadLimiter,
    ): JsonResponse {
        $exam = $exams->find($id);
        if (null === $exam) {
            return self::problem(Response::HTTP_NOT_FOUND, 'Exam reconstruction not found.', 'not-found');
        }
        if (!$this->isGranted(CollabDocumentVoter::EDIT, $exam->getDocumentName())) {
            return self::problem(Response::HTTP_FORBIDDEN, 'This reconstruction is locked.', 'locked');
        }

        $file = $request->files->get('file');
        $tooLarge = [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE];
        if ($file instanceof UploadedFile && in_array($file->getError(), $tooLarge, true)) {
            return self::problem(Response::HTTP_REQUEST_ENTITY_TOO_LARGE, 'The image is larger than 8 MB.', 'size');
        }
        if (!$file instanceof UploadedFile || !$file->isValid()) {
            return self::problem(Response::HTTP_BAD_REQUEST, 'Expected the image as "file".', 'missing');
        }
        if ($file->getSize() > ExamImage::MAX_BYTES) {
            return self::problem(Response::HTTP_REQUEST_ENTITY_TOO_LARGE, 'The image is larger than 8 MB.', 'size');
        }
        if ($images->countForExam($exam) >= ExamImage::MAX_PER_EXAM) {
            return self::problem(
                Response::HTTP_UNPROCESSABLE_ENTITY,
                'This reconstruction already holds the maximum number of images.',
                'limit'
            );
        }

        try {
            $rateLimiter->consume($uploadLimiter, 'You have uploaded a lot of images. Try again later.');
        } catch (TooManyRequestsHttpException $exception) {
            $response = self::problem(Response::HTTP_TOO_MANY_REQUESTS, $exception->getMessage(), 'rate');
            $response->headers->add($exception->getHeaders());

            return $response;
        }

        $user = $this->getUser();
        assert($user instanceof User);

        try {
            $image = $store->upload($exam, $user, $file->getContent());
        } catch (InvalidExamImageException $exception) {
            return self::problem(Response::HTTP_UNPROCESSABLE_ENTITY, $exception->getMessage(), $exception->reason);
        }

        return new JsonResponse(
            [
                'uuid' => $image->getUuid(),
                'url' => $urls->generate($image),
                'width' => $image->getWidth(),
                'height' => $image->getHeight(),
            ],
            Response::HTTP_CREATED
        );
    }

    private static function problem(int $status, string $detail, string $reason): JsonResponse
    {
        return new JsonResponse(['detail' => $detail, 'status' => $status, 'reason' => $reason], $status);
    }
}
