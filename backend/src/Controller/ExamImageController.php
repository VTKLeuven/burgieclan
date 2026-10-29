<?php

namespace App\Controller;

use App\Repository\ExamImageRepository;
use App\Service\Exam\ExamImageStore;
use League\Flysystem\FilesystemException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\HttpFoundation\UriSigner;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Serves the images of exam reconstructions:
 *
 *  - /files/exam-images/{fileName}: for links signed by ExamImageUrlGenerator, while images are
 *    stored locally. On S3 those links point at the bucket instead.
 *  - /admin/exam-image/{fileName}: for the thumbnails on the admin's exam page, behind the admin
 *    session. Always through here, so the admin's Content-Security-Policy need not allow the
 *    bucket's host; moderators are few, so streaming through PHP costs nothing.
 */
class ExamImageController extends AbstractController
{
    #[Route(
        '/files/exam-images/{fileName}',
        name: 'exam_image_signed',
        requirements: ['fileName' => '[0-9a-f-]{36}\.(png|jpg|webp)'],
        methods: ['GET']
    )]
    public function __invoke(
        string $fileName,
        Request $request,
        UriSigner $uriSigner,
        ExamImageRepository $images,
        ExamImageStore $store,
    ): Response {
        // The signature covers the path and carries its own expiry, so it stands in for the
        // access check GET /api/exams/{id}/image-urls did before signing.
        if (!$uriSigner->check($request->getRequestUri())) {
            return new Response('Link expired or invalid', Response::HTTP_FORBIDDEN);
        }

        return $this->serve($fileName, $images, $store);
    }

    #[Route(
        '/admin/exam-image/{fileName}',
        name: 'admin_exam_image',
        requirements: ['fileName' => '[0-9a-f-]{36}\.(png|jpg|webp)'],
        methods: ['GET']
    )]
    public function forAdmin(string $fileName, ExamImageRepository $images, ExamImageStore $store): Response
    {
        $this->denyAccessUnlessGranted('ROLE_MODERATOR');

        return $this->serve($fileName, $images, $store);
    }

    private function serve(string $fileName, ExamImageRepository $images, ExamImageStore $store): Response
    {
        $image = $images->findOneBy(['fileName' => $fileName]);
        if (null === $image || $image->isRemoved()) {
            return new Response('Not found', Response::HTTP_NOT_FOUND);
        }

        try {
            $stream = $store->readStream($image);
        } catch (FilesystemException) {
            return new Response('Not found', Response::HTTP_NOT_FOUND);
        }

        return new StreamedResponse(
            static function () use ($stream): void {
                fpassthru($stream);
                fclose($stream);
            },
            Response::HTTP_OK,
            [
                'Content-Type' => $image->getMimeType(),
                'Content-Length' => (string) $image->getSize(),
                // Only for whoever holds the link, and no longer than it is valid.
                'Cache-Control' => 'private, max-age=600',
                'X-Content-Type-Options' => 'nosniff',
                // Never run as a document, whatever a browser makes of it.
                'Content-Security-Policy' => "default-src 'none'",
            ]
        );
    }
}
