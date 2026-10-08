<?php

namespace App\Service\Exam;

use App\Entity\Exam;
use App\Entity\ExamImage;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use finfo;
use GdImage;
use League\Flysystem\FilesystemException;
use League\Flysystem\FilesystemOperator;
use Psr\Log\LoggerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * Stores the images of exam reconstructions, always re-encoded.
 *
 * Re-encoding does three things: it proves the upload really is an image, it scales it down to
 * ExamImage::MAX_SIDE, and it drops every bit of metadata, the GPS position of a phone photo
 * included. A JPEG is turned upright first by its EXIF orientation, which is lost with the rest.
 */
class ExamImageStore
{
    /** What we accept, by detected (not claimed) type, and the extension it is stored with. */
    public const TYPES = ['image/png' => 'png', 'image/jpeg' => 'jpg', 'image/webp' => 'webp'];

    /**
     * Decoding takes 4 bytes per pixel whatever the file size, and production gives PHP 256 MB:
     * a larger image is refused before it is decoded. 25 MP covers ordinary phone photos.
     */
    public const MAX_PIXELS = 25_000_000;

    private const JPEG_QUALITY = 85;
    private const WEBP_QUALITY = 85;

    public function __construct(
        #[Autowire(service: 'exam_images.storage')]
        private readonly FilesystemOperator $storage,
        private readonly EntityManagerInterface $entityManager,
        private readonly LoggerInterface $logger,
    ) {}

    /**
     * @throws InvalidExamImageException when it is not an image we accept, with the reason
     * @throws FilesystemException when it cannot be stored
     */
    public function upload(Exam $exam, ?User $uploader, string $bytes): ExamImage
    {
        if (strlen($bytes) > ExamImage::MAX_BYTES) {
            throw new InvalidExamImageException('The image is larger than 8 MB.', 'size');
        }

        $mimeType = (new finfo(FILEINFO_MIME_TYPE))->buffer($bytes);
        if (!is_string($mimeType) || !isset(self::TYPES[$mimeType])) {
            throw new InvalidExamImageException('Upload a PNG, JPEG or WebP image.', 'type');
        }

        $size = @getimagesizefromstring($bytes);
        if (false === $size || $size[0] < 1 || $size[1] < 1) {
            throw new InvalidExamImageException('This image cannot be read.', 'unreadable');
        }
        if ($size[0] * $size[1] > self::MAX_PIXELS) {
            throw new InvalidExamImageException('This image has too many pixels. Scale it down first.', 'pixels');
        }

        $image = @imagecreatefromstring($bytes);
        if (false === $image) {
            throw new InvalidExamImageException('This image cannot be read.', 'unreadable');
        }
        if ('image/jpeg' === $mimeType) {
            $image = $this->upright($image, $bytes);
        }
        $image = $this->scaledDown($image);
        $encoded = $this->encode($image, $mimeType);

        $examImage = new ExamImage(
            $exam,
            $uploader,
            $mimeType,
            self::TYPES[$mimeType],
            strlen($encoded),
            imagesx($image),
            imagesy($image)
        );
        $this->storage->write($examImage->getFileName(), $encoded);
        $this->entityManager->persist($examImage);
        $this->entityManager->flush();

        return $examImage;
    }

    /**
     * A moderator takes an image down: the file is deleted, and its URL shows a placeholder from
     * then on. The row stays, so the document can still name it. Does not flush.
     */
    public function remove(ExamImage $image): void
    {
        $image->markRemoved();
        $this->deleteFile($image->getFileName());
    }

    /**
     * Best effort: a file that cannot be deleted is logged, not fatal, since nothing links to it.
     */
    public function deleteFile(string $fileName): void
    {
        try {
            $this->storage->delete($fileName);
        } catch (FilesystemException $exception) {
            $this->logger->warning(
                'Could not delete exam image file "{file}": {message}',
                ['file' => $fileName, 'message' => $exception->getMessage()]
            );
        }
    }

    /**
     * @return resource
     *
     * @throws FilesystemException
     */
    public function readStream(ExamImage $image)
    {
        return $this->storage->readStream($image->getFileName());
    }

    /**
     * Applies the EXIF orientation of a JPEG to its pixels, with the same table as Intervention
     * Image: gd rotates counter-clockwise, so 270 is a quarter turn clockwise.
     */
    private function upright(GdImage $image, string $bytes): GdImage
    {
        $stream = fopen('php://memory', 'r+');
        if (false === $stream) {
            return $image;
        }
        fwrite($stream, $bytes);
        rewind($stream);
        $exif = @exif_read_data($stream);
        fclose($stream);

        $orientation = is_array($exif) ? (int) ($exif['Orientation'] ?? 1) : 1;
        [$rotation, $mirror] = match ($orientation) {
            2 => [0, true],
            3 => [180, false],
            4 => [180, true],
            5 => [270, true],
            6 => [270, false],
            7 => [90, true],
            8 => [90, false],
            default => [0, false],
        };

        if (0 !== $rotation) {
            $rotated = imagerotate($image, $rotation, 0);
            if (false !== $rotated) {
                $image = $rotated;
            }
        }
        if ($mirror) {
            imageflip($image, IMG_FLIP_HORIZONTAL);
        }

        return $image;
    }

    private function scaledDown(GdImage $image): GdImage
    {
        $width = imagesx($image);
        $height = imagesy($image);
        $scale = ExamImage::MAX_SIDE / max($width, $height);
        if ($scale >= 1) {
            return $image;
        }

        $newWidth = max(1, (int) round($width * $scale));
        $newHeight = max(1, (int) round($height * $scale));
        $scaled = imagecreatetruecolor($newWidth, $newHeight);
        // Keep transparency of PNG and WebP.
        imagealphablending($scaled, false);
        imagesavealpha($scaled, true);
        imagefill($scaled, 0, 0, (int) imagecolorallocatealpha($scaled, 0, 0, 0, 127));
        imagecopyresampled($scaled, $image, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);

        return $scaled;
    }

    private function encode(GdImage $image, string $mimeType): string
    {
        ob_start();
        match ($mimeType) {
            'image/png' => imagesavealpha($image, true) && imagepng($image, null, 6),
            'image/webp' => imagesavealpha($image, true) && imagewebp($image, null, self::WEBP_QUALITY),
            default => imagejpeg($image, null, self::JPEG_QUALITY),
        };

        return (string) ob_get_clean();
    }
}
