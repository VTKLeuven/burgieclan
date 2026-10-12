<?php

namespace App\Entity;

use App\Repository\ExamImageRepository;
use DateTimeImmutable;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * An image in an exam reconstruction, e.g. a drawing or a schema that belongs to a question.
 *
 * The live document only holds its UUID (the `examImage` node), never the image itself: base64
 * in the document would bloat every store and every revision. Nor does it hold a URL: images are
 * not public. The page asks GET /api/exams/{id}/image-urls, which checks that you may see the
 * exam and hands out short-lived links (ExamImageUrlGenerator).
 *
 * Images are stored re-encoded (ExamImageStore): at most MAX_SIDE pixels, without metadata.
 * They are kept as long as the exam exists, since a rollback can bring back an old one. A
 * moderator removing one deletes the file; the page then shows a "removed" placeholder.
 */
#[ORM\Entity(repositoryClass: ExamImageRepository::class)]
class ExamImage extends BaseEntity
{
    /** Largest accepted upload, in bytes. */
    public const MAX_BYTES = 8 * 1024 * 1024;

    /** Longest side of a stored image, in pixels; larger uploads are scaled down. */
    public const MAX_SIDE = 2000;

    /** Images one reconstruction may hold, removed ones included. */
    public const MAX_PER_EXAM = 150;

    #[ORM\Column(type: Types::GUID, unique: true)]
    private string $uuid;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Exam $exam;

    /** Null once their account is deleted: the image stays part of the reconstruction. */
    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?User $uploader;

    /** Name of the file in the exam_images.storage filesystem. */
    #[ORM\Column(length: 64)]
    private string $fileName;

    #[ORM\Column(length: 32)]
    private string $mimeType;

    /** In bytes, as stored. */
    #[ORM\Column]
    private int $size;

    #[ORM\Column]
    private int $width;

    #[ORM\Column]
    private int $height;

    /** When a moderator removed it; the file is gone from then on. */
    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?DateTimeImmutable $removedAt = null;

    public function __construct(
        Exam $exam,
        ?User $uploader,
        string $mimeType,
        string $extension,
        int $size,
        int $width,
        int $height,
    ) {
        $this->uuid = self::randomUuid();
        $this->exam = $exam;
        $this->uploader = $uploader;
        $this->fileName = $this->uuid . '.' . $extension;
        $this->mimeType = $mimeType;
        $this->size = $size;
        $this->width = $width;
        $this->height = $height;
    }

    /** A version 4 UUID: 122 random bits, so nobody finds an image by guessing. */
    private static function randomUuid(): string
    {
        $bytes = random_bytes(16);
        $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
        $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
    }

    public function getUuid(): string
    {
        return $this->uuid;
    }

    public function getExam(): Exam
    {
        return $this->exam;
    }

    public function getUploader(): ?User
    {
        return $this->uploader;
    }

    public function getFileName(): string
    {
        return $this->fileName;
    }

    public function getMimeType(): string
    {
        return $this->mimeType;
    }

    public function getSize(): int
    {
        return $this->size;
    }

    public function getWidth(): int
    {
        return $this->width;
    }

    public function getHeight(): int
    {
        return $this->height;
    }

    public function isRemoved(): bool
    {
        return null !== $this->removedAt;
    }

    public function getRemovedAt(): ?DateTimeImmutable
    {
        return $this->removedAt;
    }

    public function markRemoved(?DateTimeImmutable $now = null): static
    {
        $this->removedAt = $now ?? new DateTimeImmutable();

        return $this;
    }
}
