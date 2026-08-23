<?php

namespace App\Command;

use App\Entity\Course;
use App\Entity\Document;
use App\Entity\DocumentCategory;
use App\Entity\Tag;
use App\Entity\User;
use App\Repository\DocumentRepository;
use App\Repository\TagRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\Persistence\ManagerRegistry;
use JsonException;
use RuntimeException;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Throwable;
use Vich\UploaderBundle\FileAbstraction\ReplacingFile;

/**
 * Imports migrated Seafile documents into the database and object storage.
 *
 * Reads a prepared JSONL manifest line by line - never loading the whole file into
 * memory, since the real manifest describes roughly 16,905 documents totalling 58 GB -
 * and attaches each staged file on disk to a new Document through Vich's ReplacingFile,
 * which lets us hand it an already-existing path without pretending it was an upload.
 *
 * Idempotency is keyed on the (`seafile_file_id`, `course_id`) pair, which is what
 * the database enforces as unique - not `seafile_file_id` alone, since the same
 * Seafile file can legitimately belong to two different courses. A record whose
 * pair already exists in the database is skipped, so an interrupted run can simply
 * be started again from the same manifest.
 *
 * Documents are persisted in batches. Each batch is flushed and then the entity
 * manager is cleared to keep memory flat over a run this large; because clear()
 * detaches everything, entities from earlier batches are never held onto - Course,
 * DocumentCategory and the creator User are resolved with getReference() (no query)
 * on every record, and Tags are cached by name => id so a repeat tag does not need a
 * fresh lookup either.
 *
 * A single bad record - a missing file on disk, an unparsable manifest line - is
 * caught, logged to a `.failures.jsonl` file next to the manifest, and does not stop
 * the run. If flushing an entire batch fails, that failure is reported for every
 * record in the batch and the entity manager is reset before moving on.
 *
 * Usage:
 *
 *     php bin/console app:import:seafile --manifest=manifest_final_for_import.jsonl --staged-dir=/staged
 *     php bin/console app:import:seafile --manifest=... --staged-dir=... --dry-run
 *     php bin/console app:import:seafile --manifest=... --staged-dir=... --course=H0N08A --limit=10
 *     php bin/console app:import:seafile --manifest=... --staged-dir=... --batch-size=100
 */
#[AsCommand(
    name: 'app:import:seafile',
    description: 'Import migrated Seafile documents',
)]
class ImportSeafileCommand extends Command
{
    /** Default creator used for imported documents when --creator is not given. */
    private const DEFAULT_CREATOR_EMAIL = 'it@vtk.be';

    /** How many records to process between progress lines. */
    private const PROGRESS_EVERY = 250;

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly ManagerRegistry $doctrine,
        private readonly UserRepository $userRepository,
        private readonly TagRepository $tagRepository,
        private readonly DocumentRepository $documentRepository
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addOption('manifest', null, InputOption::VALUE_REQUIRED, 'Path to manifest_final_for_import.jsonl')
            ->addOption('staged-dir', null, InputOption::VALUE_REQUIRED, 'Root directory of the staged files')
            ->addOption(
                'creator',
                null,
                InputOption::VALUE_REQUIRED,
                'Email of the user recorded as the creator of imported documents',
                self::DEFAULT_CREATOR_EMAIL
            )
            ->addOption(
                'batch-size',
                null,
                InputOption::VALUE_REQUIRED,
                'Number of records to persist per flush/clear batch',
                '50'
            )
            ->addOption('limit', null, InputOption::VALUE_REQUIRED, 'Stop after this many successful imports')
            ->addOption('course', null, InputOption::VALUE_REQUIRED, 'Only import records whose course_code matches')
            ->addOption(
                'dry-run',
                null,
                InputOption::VALUE_NONE,
                'Resolve and validate everything, upload/persist nothing'
            );
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        $manifestPath = $input->getOption('manifest');
        $stagedDirOption = $input->getOption('staged-dir');
        if (!is_string($manifestPath) || $manifestPath === '') {
            $io->error('--manifest is required.');

            return Command::FAILURE;
        }

        if (!is_string($stagedDirOption) || $stagedDirOption === '') {
            $io->error('--staged-dir is required.');

            return Command::FAILURE;
        }

        if (!is_file($manifestPath) || !is_readable($manifestPath)) {
            $io->error(sprintf('Manifest file not found or not readable: %s', $manifestPath));

            return Command::FAILURE;
        }

        if (!is_dir($stagedDirOption)) {
            $io->error(sprintf('Staged directory not found: %s', $stagedDirOption));

            return Command::FAILURE;
        }

        $stagedDir = rtrim($stagedDirOption, '/');
        $creatorEmail = (string)($input->getOption('creator') ?? self::DEFAULT_CREATOR_EMAIL);
        $batchSize = max(1, (int)$input->getOption('batch-size'));
        $limitOption = $input->getOption('limit');
        $limit = is_string($limitOption) && $limitOption !== '' ? max(0, (int)$limitOption) : null;
        $courseOption = $input->getOption('course');
        $courseFilter = is_string($courseOption) && $courseOption !== '' ? $courseOption : null;
        $dryRun = (bool)$input->getOption('dry-run');

        $creator = $this->userRepository->findOneByEmail($creatorEmail);
        if (!$creator instanceof User) {
            $io->error(sprintf('No user found with email "%s".', $creatorEmail));

            return Command::FAILURE;
        }

        $creatorId = $creator->getId();
        if ($creatorId === null) {
            $io->error('The creator user has no id.');

            return Command::FAILURE;
        }

        $io->title('Seafile import');
        $io->definitionList(
            ['manifest' => $manifestPath],
            ['staged dir' => $stagedDir],
            ['creator' => $creatorEmail],
            ['batch size' => (string)$batchSize],
            ['dry-run' => $dryRun ? 'yes' : 'no'],
        );

        if ($dryRun) {
            $io->note('Dry run - nothing will be uploaded or persisted.');
        }

        $handle = @fopen($manifestPath, 'rb');
        if ($handle === false) {
            $io->error(sprintf('Could not open manifest file: %s', $manifestPath));

            return Command::FAILURE;
        }

        $failuresPath = $manifestPath . '.failures.jsonl';
        $failuresHandle = @fopen($failuresPath, 'wb');
        if ($failuresHandle === false) {
            fclose($handle);
            $io->error(sprintf('Could not open failures log for writing: %s', $failuresPath));

            return Command::FAILURE;
        }

        $em = $this->em;

        $totalRead = 0;
        $imported = 0;
        $skipped = 0;
        $failed = 0;
        $bytes = 0;
        $lastProgressAt = 0;

        /** @var array<string, int> $tagIdCache */
        $tagIdCache = [];
        /** @var array<string, Tag> $pendingTags */
        $pendingTags = [];

        $startedAt = microtime(true);
        $eof = false;

        while (!$eof && ($limit === null || $imported < $limit)) {
            $batch = $this->readBatch($handle, $batchSize, $courseFilter, $failuresHandle);
            $totalRead += $batch['read'];
            $failed += $batch['failed'];
            $eof = $batch['eof'];
            $records = $batch['records'];

            if ($records === []) {
                continue;
            }

            $fileIds = [];
            foreach ($records as $record) {
                $fileId = $record['file_id'] ?? null;
                if (is_string($fileId) && $fileId !== '') {
                    $fileIds[] = $fileId;
                }
            }

            $existing = $this->findExistingPairs($fileIds);

            /** @var list<array{record: array<string, mixed>, size: int}> $pending */
            $pending = [];
            $seenInBatch = [];

            foreach ($records as $record) {
                $fileId = $this->toNullableString($record['file_id'] ?? null) ?? '';
                $courseIdForSkipCheck = $this->toId($record['course_id'] ?? null);
                $pairKey = $fileId !== '' && $courseIdForSkipCheck !== null
                    ? $this->pairKey($fileId, $courseIdForSkipCheck)
                    : null;

                if ($pairKey !== null && (isset($existing[$pairKey]) || isset($seenInBatch[$pairKey]))) {
                    $skipped++;
                    continue;
                }

                try {
                    $size = $this->buildDocument(
                        $record,
                        $em,
                        $creatorId,
                        $stagedDir,
                        $tagIdCache,
                        $pendingTags,
                        $dryRun
                    );
                } catch (Throwable $e) {
                    $failed++;
                    $this->logFailure($failuresHandle, $record, $e->getMessage());
                    continue;
                }

                if ($pairKey !== null) {
                    $seenInBatch[$pairKey] = true;
                }

                $pending[] = ['record' => $record, 'size' => $size];
            }

            if ($pending === []) {
                $this->reportProgress($io, $totalRead, $lastProgressAt, $imported, $skipped, $failed, $bytes);
                continue;
            }

            if ($dryRun) {
                $imported += count($pending);
                foreach ($pending as $p) {
                    $bytes += $p['size'];
                }

                $this->reportProgress($io, $totalRead, $lastProgressAt, $imported, $skipped, $failed, $bytes);
                continue;
            }

            try {
                $em->flush();
            } catch (Throwable $e) {
                $io->text(sprintf('  batch flush failed: %s', $e->getMessage()));

                foreach ($pending as $p) {
                    $failed++;
                    $this->logFailure($failuresHandle, $p['record'], 'Batch flush failed: ' . $e->getMessage());
                }

                $reset = $this->doctrine->resetManager();
                if (!$reset instanceof EntityManagerInterface) {
                    throw new RuntimeException('Doctrine did not return an ORM entity manager after reset.');
                }

                $em = $reset;
                $pendingTags = [];

                $this->reportProgress($io, $totalRead, $lastProgressAt, $imported, $skipped, $failed, $bytes);
                continue;
            }

            foreach ($pendingTags as $name => $tag) {
                $id = $tag->getId();
                if ($id !== null) {
                    $tagIdCache[$name] = $id;
                }
            }
            $pendingTags = [];

            $em->clear();

            $imported += count($pending);
            foreach ($pending as $p) {
                $bytes += $p['size'];
            }

            $this->reportProgress($io, $totalRead, $lastProgressAt, $imported, $skipped, $failed, $bytes);
        }

        fclose($handle);
        fclose($failuresHandle);

        $elapsed = microtime(true) - $startedAt;

        $io->newLine();
        $io->table(
            ['Metric', 'Value'],
            [
                ['Records read', (string)$totalRead],
                ['Imported', (string)$imported],
                ['Skipped (already imported)', (string)$skipped],
                ['Failed', (string)$failed],
                ['Bytes uploaded', $this->formatBytes($bytes)],
                ['Elapsed', $this->formatDuration($elapsed)],
            ]
        );

        if ($failed > 0) {
            $io->warning(sprintf('%d record(s) failed - see %s', $failed, $failuresPath));

            return Command::FAILURE;
        }

        $io->success('Seafile import complete.');

        return Command::SUCCESS;
    }

    /**
     * Reads up to $batchSize valid, course-filtered records from the manifest.
     *
     * @param resource $handle
     * @param resource $failuresHandle
     *
     * @return array{records: list<array<string, mixed>>, read: int, failed: int, eof: bool}
     */
    private function readBatch($handle, int $batchSize, ?string $courseFilter, $failuresHandle): array
    {
        /** @var list<array<string, mixed>> $records */
        $records = [];
        $read = 0;
        $failed = 0;
        $eof = false;

        while (count($records) < $batchSize) {
            $line = fgets($handle);
            if ($line === false) {
                $eof = true;
                break;
            }

            $trimmed = trim($line);
            if ($trimmed === '') {
                continue;
            }

            $read++;

            try {
                $record = json_decode($trimmed, true, 512, JSON_THROW_ON_ERROR);
            } catch (JsonException $e) {
                $failed++;
                $this->logFailure($failuresHandle, null, 'Could not parse JSONL line: ' . $e->getMessage());
                continue;
            }

            if (!is_array($record)) {
                $failed++;
                $this->logFailure($failuresHandle, null, 'Manifest line did not decode to an object.');
                continue;
            }

            if ($courseFilter !== null) {
                $courseCode = $record['course_code'] ?? null;
                if (!is_string($courseCode) || $courseCode !== $courseFilter) {
                    continue;
                }
            }

            /** @var array<string, mixed> $record */
            $records[] = $record;
        }

        return ['records' => $records, 'read' => $read, 'failed' => $failed, 'eof' => $eof];
    }

    /**
     * Looks up which (seafile_file_id, course_id) pairs already have a Document, in
     * one query per batch. The unique constraint is on the pair, not on
     * seafile_file_id alone - the same Seafile file can belong to two courses - so
     * the `IN (:ids)` prefilter is widened in PHP to an exact pair match.
     *
     * @param list<string> $fileIds
     *
     * @return array<string, bool> keyed by pairKey()
     */
    private function findExistingPairs(array $fileIds): array
    {
        if ($fileIds === []) {
            return [];
        }

        $rows = $this->documentRepository->createQueryBuilder('d')
            ->select('d.seafile_file_id AS fileId', 'IDENTITY(d.course) AS courseId')
            ->andWhere('d.seafile_file_id IN (:ids)')
            ->setParameter('ids', $fileIds)
            ->getQuery()
            ->getScalarResult();

        $existing = [];
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }

            $fileId = $this->toNullableString($row['fileId'] ?? null);
            $courseId = $this->toId($row['courseId'] ?? null);
            if ($fileId !== null && $fileId !== '' && $courseId !== null) {
                $existing[$this->pairKey($fileId, $courseId)] = true;
            }
        }

        return $existing;
    }

    private function pairKey(string $fileId, int $courseId): string
    {
        return $fileId . '#' . $courseId;
    }

    /**
     * Builds and persists a Document for one manifest record. Returns its size in
     * bytes, taken from the manifest so the caller never has to stat() the file.
     *
     * @param array<string, mixed> $record
     * @param array<string, int> $tagIdCache
     * @param array<string, Tag> $pendingTags
     */
    private function buildDocument(
        array $record,
        EntityManagerInterface $em,
        int $creatorId,
        string $stagedDir,
        array &$tagIdCache,
        array &$pendingTags,
        bool $dryRun
    ): int {
        $fileId = $this->toNullableString($record['file_id'] ?? null);
        if ($fileId === null || $fileId === '') {
            throw new RuntimeException('Record has no file_id.');
        }

        $repoName = $this->toNullableString($record['repo_name'] ?? null);
        $path = $this->toNullableString($record['path'] ?? null);
        if ($repoName === null || $repoName === '' || $path === null || $path === '') {
            throw new RuntimeException('Record has no repo_name/path.');
        }

        $courseId = $this->toId($record['course_id'] ?? null);
        if ($courseId === null) {
            throw new RuntimeException('Record has no valid course_id.');
        }

        $categoryId = $this->toId($record['category_id'] ?? null);
        if ($categoryId === null) {
            throw new RuntimeException('Record has no valid category_id.');
        }

        $absolutePath = $stagedDir . '/' . $repoName . $path;

        // Stop here on a dry run, before the entity manager is touched at all.
        // Doctrine fires prePersist from persist(), not from flush(), and Vich
        // uploads the file from that listener - so persisting a Document during
        // a dry run would push the real bytes into the real bucket and leave
        // them orphaned when the run ends without flushing.
        if ($dryRun) {
            if (!is_file($absolutePath)) {
                throw new RuntimeException(sprintf('The file "%s" does not exist', $absolutePath));
            }

            return $this->recordSize($record);
        }

        $displayTitle = $this->toNullableString($record['display_title'] ?? null)
            ?? $this->toNullableString($record['title'] ?? null)
            ?? $this->toNullableString($record['filename'] ?? null)
            ?? $fileId;
        $name = mb_substr($displayTitle, 0, 255);

        $yearValue = $this->toNullableString($record['year'] ?? null);
        $year = $yearValue !== null && $yearValue !== '' ? mb_substr($yearValue, 0, 11) : null;

        $document = new Document($this->reference($em, User::class, $creatorId));
        $document->setName($name);
        $document->setCourse($this->reference($em, Course::class, $courseId));
        $document->setCategory($this->reference($em, DocumentCategory::class, $categoryId));
        $document->setUnderReview(false);
        $document->setAnonymous(false);
        $document->setYear($year);
        $document->setSeafileFileId($fileId);

        $tags = $record['tags'] ?? [];
        if (is_array($tags)) {
            foreach ($tags as $tagName) {
                $tagName = $this->toNullableString($tagName);
                if ($tagName === null || trim($tagName) === '') {
                    continue;
                }

                $document->addTag($this->resolveTag(trim($tagName), $em, $tagIdCache, $pendingTags));
            }
        }

        // Missing/unreadable source files surface here as a FileNotFoundException,
        // caught per record by the caller - not a reason to abort the run.
        $document->setFile(new ReplacingFile($absolutePath));

        $em->persist($document);

        return $this->recordSize($record);
    }

    /**
     * Size of one record, taken from the manifest so the file is never stat()ed.
     *
     * @param array<string, mixed> $record
     */
    private function recordSize(array $record): int
    {
        $sizeBytes = $record['size_bytes'] ?? null;
        if (is_int($sizeBytes)) {
            return $sizeBytes;
        }

        return is_numeric($sizeBytes) ? (int)$sizeBytes : 0;
    }

    /**
     * Resolves a Tag by name, creating it if needed, without ever holding onto a
     * Tag entity across an entity manager clear().
     *
     * @param array<string, int> $tagIdCache
     * @param array<string, Tag> $pendingTags
     */
    private function resolveTag(
        string $name,
        EntityManagerInterface $em,
        array &$tagIdCache,
        array &$pendingTags
    ): Tag {
        if (isset($tagIdCache[$name])) {
            return $this->reference($em, Tag::class, $tagIdCache[$name]);
        }

        if (isset($pendingTags[$name])) {
            return $pendingTags[$name];
        }

        $existing = $this->tagRepository->findOneBy(['name' => $name]);
        if ($existing instanceof Tag) {
            $id = $existing->getId();
            if ($id !== null) {
                $tagIdCache[$name] = $id;
            }

            return $existing;
        }

        $tag = new Tag();
        $tag->setName($name);
        $em->persist($tag);
        $pendingTags[$name] = $tag;

        return $tag;
    }

    /**
     * Gets a reference to an entity by id, without querying the database.
     *
     * @template T of object
     *
     * @param class-string<T> $class
     *
     * @return T
     */
    private function reference(EntityManagerInterface $em, string $class, int $id): object
    {
        $entity = $em->getReference($class, $id);
        if ($entity === null) {
            throw new RuntimeException(sprintf('Could not build a reference to %s #%d.', $class, $id));
        }

        return $entity;
    }

    private function toId(mixed $value): ?int
    {
        if (is_int($value) && $value > 0) {
            return $value;
        }

        if (is_string($value) && ctype_digit($value)) {
            return (int)$value;
        }

        return null;
    }

    private function toNullableString(mixed $value): ?string
    {
        if (is_string($value)) {
            return $value;
        }

        if (is_int($value) || is_float($value)) {
            return (string)$value;
        }

        return null;
    }

    /**
     * @param resource $failuresHandle
     * @param array<string, mixed>|null $record
     */
    private function logFailure($failuresHandle, ?array $record, string $message): void
    {
        $entry = [
            'file_id' => $record['file_id'] ?? null,
            'path' => $record['path'] ?? null,
            'error' => $message,
        ];

        try {
            $line = json_encode($entry, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            $line = '{"file_id":null,"path":null,"error":"failed to encode failure entry"}';
        }

        fwrite($failuresHandle, $line . "\n");
    }

    private function reportProgress(
        SymfonyStyle $io,
        int $totalRead,
        int &$lastProgressAt,
        int $imported,
        int $skipped,
        int $failed,
        int $bytes
    ): void {
        if ($totalRead - $lastProgressAt < self::PROGRESS_EVERY) {
            return;
        }

        $lastProgressAt = $totalRead;

        $io->text(
            sprintf(
                '  ... %d imported, %d skipped, %d failed, %s so far',
                $imported,
                $skipped,
                $failed,
                $this->formatBytes($bytes)
            )
        );
    }

    private function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $power = $bytes > 0 ? (int)floor(log($bytes, 1024)) : 0;
        $power = min($power, count($units) - 1);

        return sprintf('%.1f %s', $bytes / (1024 ** $power), $units[$power]);
    }

    private function formatDuration(float $seconds): string
    {
        $totalSeconds = (int)round($seconds);
        $hours = intdiv($totalSeconds, 3600);
        $minutes = intdiv($totalSeconds % 3600, 60);
        $secs = $totalSeconds % 60;

        return sprintf('%02d:%02d:%02d', $hours, $minutes, $secs);
    }
}
