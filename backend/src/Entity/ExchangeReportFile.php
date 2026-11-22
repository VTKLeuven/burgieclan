<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

/**
 * A file attached to an exchange report, typically the whole course package of a master at the
 * host as one PDF or Word file: easier to share than typing every course into the form, and what
 * students planning their own exchange find most useful.
 *
 * Stored under a random name in the exchange_files.storage filesystem (ExchangeReportFileStore);
 * readers get a short-lived link (ExchangeReportFileUrlGenerator) and the file under its original
 * name. Visible to whoever may see the report. The stored file is deleted with the row
 * (ExchangeReportFileCleanup).
 */
#[ORM\Entity]
class ExchangeReportFile extends BaseEntity
{
    #[ORM\ManyToOne(inversedBy: 'files')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ExchangeReport $report;

    /** Name of the file in the exchange_files.storage filesystem: a UUID and the extension. */
    #[ORM\Column(length: 64, unique: true)]
    private string $fileName;

    /** The name it was uploaded under, and is downloaded under. */
    #[ORM\Column(length: 200)]
    private string $originalName;

    #[ORM\Column(length: 100)]
    private string $mimeType;

    /** In bytes. */
    #[ORM\Column]
    private int $size;

    public function __construct(ExchangeReport $report, string $extension, string $originalName, string $mimeType, int $size)
    {
        $this->report = $report;
        $this->fileName = self::randomUuid() . '.' . $extension;
        $this->originalName = $originalName;
        $this->mimeType = $mimeType;
        $this->size = $size;
    }

    /** A version 4 UUID: 122 random bits, so nobody finds a file by guessing. */
    private static function randomUuid(): string
    {
        $bytes = random_bytes(16);
        $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
        $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
    }

    public function getReport(): ExchangeReport
    {
        return $this->report;
    }

    public function getFileName(): string
    {
        return $this->fileName;
    }

    public function getOriginalName(): string
    {
        return $this->originalName;
    }

    public function getMimeType(): string
    {
        return $this->mimeType;
    }

    public function getSize(): int
    {
        return $this->size;
    }

    public function getExtension(): string
    {
        return pathinfo($this->fileName, PATHINFO_EXTENSION);
    }

    public function __toString(): string
    {
        return $this->originalName;
    }
}
