<?php

namespace App\Service\Exchange;

use App\Entity\ExchangeReport;
use App\Entity\ExchangeReportFile;
use finfo;
use League\Flysystem\FilesystemException;
use League\Flysystem\FilesystemOperator;
use Psr\Log\LoggerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\File\UploadedFile;

/**
 * Checks and stores the files attached to exchange reports: documents and images, by extension
 * and by what the bytes turn out to be, so a renamed executable is refused.
 */
class ExchangeReportFileStore
{
    public const MAX_BYTES = 20 * 1024 * 1024;
    public const MAX_FILES = 5;

    /**
     * Accepted extensions => [the Content-Type it is served with, the types finfo may detect].
     * Office Open XML and OpenDocument files are zip archives; finfo names them by their contents
     * only when the archive starts with the right entry, which not every program writes.
     */
    private const TYPES = [
        'pdf' => ['application/pdf', ['application/pdf']],
        'docx' => [
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip'],
        ],
        'xlsx' => [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/zip'],
        ],
        'pptx' => [
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/zip'],
        ],
        'odt' => ['application/vnd.oasis.opendocument.text', ['application/vnd.oasis.opendocument.text', 'application/zip']],
        'ods' => ['application/vnd.oasis.opendocument.spreadsheet', ['application/vnd.oasis.opendocument.spreadsheet', 'application/zip']],
        // The old binary Office formats are OLE containers, which finfo names in several ways.
        'doc' => ['application/msword', ['application/msword', 'application/vnd.ms-office', 'application/CDFV2', 'application/x-ole-storage']],
        'xls' => ['application/vnd.ms-excel', ['application/vnd.ms-excel', 'application/vnd.ms-office', 'application/CDFV2', 'application/x-ole-storage']],
        'png' => ['image/png', ['image/png']],
        'jpg' => ['image/jpeg', ['image/jpeg']],
        'jpeg' => ['image/jpeg', ['image/jpeg']],
    ];

    /** Shown in the browser rather than downloaded: none of these can run script. */
    private const INLINE = ['pdf', 'png', 'jpg', 'jpeg'];

    public function __construct(
        #[Autowire(service: 'exchange_files.storage')]
        private readonly FilesystemOperator $storage,
        private readonly LoggerInterface $logger,
    ) {}

    /** @return list<string> */
    public static function extensions(): array
    {
        return array_keys(self::TYPES);
    }

    public static function contentType(ExchangeReportFile $file): string
    {
        return self::TYPES[$file->getExtension()][0] ?? 'application/octet-stream';
    }

    public static function isInline(ExchangeReportFile $file): bool
    {
        return in_array($file->getExtension(), self::INLINE, true);
    }

    /**
     * Checks an upload without storing it.
     *
     * @throws InvalidExchangeFileException
     */
    public function check(UploadedFile $upload): void
    {
        if (in_array($upload->getError(), [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true) || ($upload->isValid() && $upload->getSize() > self::MAX_BYTES)) {
            throw new InvalidExchangeFileException(sprintf('"%s" is larger than 20 MB.', $upload->getClientOriginalName()), 'size');
        }
        if (!$upload->isValid()) {
            throw new InvalidExchangeFileException('A file did not arrive whole. Try again.', 'failed');
        }

        $extension = strtolower($upload->getClientOriginalExtension());
        $detected = (new finfo(FILEINFO_MIME_TYPE))->file($upload->getPathname());
        if (!isset(self::TYPES[$extension]) || !in_array($detected, self::TYPES[$extension][1], true)) {
            throw new InvalidExchangeFileException(
                sprintf('"%s" is not a PDF, Word, Excel, PowerPoint, OpenDocument or image file.', $upload->getClientOriginalName()),
                'type'
            );
        }
    }

    /**
     * Writes a checked upload to storage and adds it to the report. The caller persists the report;
     * if that fails, it deletes the written files again with deleteFile().
     *
     * @throws FilesystemException
     */
    public function store(ExchangeReport $report, UploadedFile $upload): ExchangeReportFile
    {
        $extension = strtolower($upload->getClientOriginalExtension());
        $file = new ExchangeReportFile(
            $report,
            'jpeg' === $extension ? 'jpg' : $extension,
            self::cleanName($upload->getClientOriginalName()),
            self::TYPES[$extension][0],
            (int) $upload->getSize()
        );

        $stream = fopen($upload->getPathname(), 'rb');
        if (false === $stream) {
            throw new InvalidExchangeFileException('A file could not be read. Try again.', 'failed');
        }
        try {
            $this->storage->writeStream($file->getFileName(), $stream);
        } finally {
            if (is_resource($stream)) {
                fclose($stream);
            }
        }
        $report->addFile($file);

        return $file;
    }

    /**
     * @return resource
     *
     * @throws FilesystemException
     */
    public function readStream(ExchangeReportFile $file)
    {
        return $this->storage->readStream($file->getFileName());
    }

    /** Best effort: a file that cannot be deleted is logged, not fatal, since nothing links to it any more. */
    public function deleteFile(string $fileName): void
    {
        try {
            $this->storage->delete($fileName);
        } catch (FilesystemException $exception) {
            $this->logger->warning(
                'Could not delete exchange report file "{file}": {message}',
                ['file' => $fileName, 'message' => $exception->getMessage()]
            );
        }
    }

    /** The uploaded name without a path, control characters or more than 200 characters. */
    private static function cleanName(string $name): string
    {
        $name = trim((string) preg_replace('/[\x00-\x1F\x7F\/\\\\]+/u', ' ', basename(str_replace('\\', '/', $name))));
        if ('' === $name) {
            return 'bestand';
        }
        if (mb_strlen($name) <= 200) {
            return $name;
        }
        $extension = pathinfo($name, PATHINFO_EXTENSION);
        $keep = 200 - mb_strlen($extension) - 1;

        return mb_substr(pathinfo($name, PATHINFO_FILENAME), 0, $keep) . '.' . $extension;
    }
}
