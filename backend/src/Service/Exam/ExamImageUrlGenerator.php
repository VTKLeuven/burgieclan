<?php

namespace App\Service\Exam;

use App\Entity\ExamImage;
use App\Service\DocumentFileUrlGenerator;
use App\Service\PresignedUrlGenerator;
use Symfony\Component\HttpFoundation\UriSigner;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;

/**
 * Short-lived links to the images of exam reconstructions, the same kind DocumentFileUrlGenerator
 * hands out for documents: a pre-signed bucket URL on S3, a signed URL to /files/exam-images/...
 * (ExamImageController) on local storage. Whoever asks has already been checked; the link is its
 * own authorisation, since an <img> carries no token.
 */
class ExamImageUrlGenerator
{
    /** Where the images sit in the bucket (exam_images.s3 in flysystem.yaml). */
    public const BUCKET_PREFIX = 'exam-images/';

    public const TTL_MINUTES = DocumentFileUrlGenerator::TTL_MINUTES;

    public function __construct(
        private readonly PresignedUrlGenerator $presignedUrlGenerator,
        private readonly UriSigner $uriSigner,
        private readonly UrlGeneratorInterface $urlGenerator,
    ) {
    }

    public function generate(ExamImage $image): string
    {
        if ($this->presignedUrlGenerator->isEnabled()) {
            return $this->presignedUrlGenerator->generateForKey(
                self::BUCKET_PREFIX . $image->getFileName(),
                $image->getFileName(),
                inline: true,
                contentType: $image->getMimeType(),
            );
        }

        return $this->uriSigner->sign(
            $this->urlGenerator->generate('exam_image_signed', ['fileName' => $image->getFileName()]),
            new \DateInterval(sprintf('PT%dM', self::TTL_MINUTES))
        );
    }
}
