<?php

namespace App\Command;

use Aws\S3\S3Client;
use RuntimeException;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Helper\Table;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Restores the database and document files from the backup bucket.
 *
 * Usage:
 *
 *     php bin/console app:restore --list              # list available backups
 *     php bin/console app:restore                     # restore latest database dump
 *     php bin/console app:restore --stamp=2026-08-22T19-35-24
 *     php bin/console app:restore --dry-run           # test and verify, write nothing
 *     php bin/console app:restore --with-documents    # also restore document files
 *     php bin/console app:restore --force             # bypass confirmation prompt
 */
#[AsCommand(
    name: 'app:restore',
    description: 'Restore the database and document files from the backup bucket',
)]
class RestoreCommand extends Command
{
    /** Object key prefixes inside the backup bucket. */
    private const DATABASE_PREFIX = 'database/';
    private const DOCUMENTS_PREFIX = 'documents/';

    /** Custom-format pg_dump archives start with this magic string. */
    private const PGDUMP_MAGIC = 'PGDMP';

    protected function configure(): void
    {
        $this
            ->addOption('list', 'l', InputOption::VALUE_NONE, 'List available backups in the backup bucket')
            ->addOption(
                'stamp',
                's',
                InputOption::VALUE_REQUIRED,
                'Timestamp or key of the backup to restore (defaults to latest)'
            )
            ->addOption('dry-run', null, InputOption::VALUE_NONE, 'Verify the archive without modifying the database')
            ->addOption(
                'with-documents',
                null,
                InputOption::VALUE_NONE,
                'Also restore document files from the backup bucket'
            )
            ->addOption('skip-database', null, InputOption::VALUE_NONE, 'Do not restore the database')
            ->addOption('force', 'f', InputOption::VALUE_NONE, 'Do not ask for confirmation before restoring');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        try {
            $config = $this->readConfiguration();
        } catch (RuntimeException $e) {
            $io->error($e->getMessage());

            return Command::FAILURE;
        }

        $sameStore = $config['source']['endpoint'] === $config['backup']['endpoint'];
        $backupClient = $this->createClient($config['backup']);
        $sourceClient = $sameStore ? $backupClient : $this->createClient($config['source']);

        if ($input->getOption('list')) {
            $this->listBackups($io, $backupClient, $config['backup']['bucket']);

            return Command::SUCCESS;
        }

        $dryRun = (bool)$input->getOption('dry-run');
        $withDocuments = (bool)$input->getOption('with-documents');
        $skipDatabase = (bool)$input->getOption('skip-database');
        $force = (bool)$input->getOption('force');

        $io->title('Burgieclan restore');
        $io->definitionList(
            ['backup' => sprintf('%s @ %s', $config['backup']['bucket'], $config['backup']['endpoint'])],
            ['target db' => $this->parseDatabaseUrl($config['database_url'])['dbname']],
            ['target docs' => sprintf('%s @ %s', $config['source']['bucket'], $config['source']['endpoint'])],
            ['copy mode' => $sameStore ? 'server-side' : 'streamed (different locations)'],
        );

        if ($dryRun) {
            $io->note('Dry run - nothing will be modified.');
        }

        try {
            if (!$skipDatabase) {
                $targetKey = $this->resolveTargetDump(
                    $backupClient,
                    $config['backup']['bucket'],
                    $input->getOption('stamp')
                );

                $io->section(sprintf('Target Database Dump: %s', $targetKey));

                if (!$dryRun && !$force) {
                    $dsn = $this->parseDatabaseUrl($config['database_url']);
                    $confirm = $io->confirm(
                        sprintf(
                            'Are you sure you want to restore "%s" into "%s"? This will OVERWRITE existing data.',
                            $targetKey,
                            $dsn['dbname']
                        ),
                        false
                    );

                    if (!$confirm) {
                        $io->note('Restore aborted.');

                        return Command::SUCCESS;
                    }
                }

                $this->restoreDatabase($io, $backupClient, $config, $targetKey, $dryRun);
            }

            if ($withDocuments) {
                $this->restoreDocuments(
                    $io,
                    $backupClient,
                    $sourceClient,
                    $config,
                    $sameStore,
                    $dryRun
                );
            }
        } catch (RuntimeException $e) {
            $io->error($e->getMessage());

            return Command::FAILURE;
        }

        $io->success('Restore completed successfully.');

        return Command::SUCCESS;
    }

    /**
     * Lists available backup dumps in the backup bucket.
     */
    private function listBackups(SymfonyStyle $io, S3Client $client, string $bucket): void
    {
        $io->title(sprintf('Available backups in %s', $bucket));

        $dumps = $this->listObjectMetadata($client, $bucket, self::DATABASE_PREFIX);
        if ($dumps === []) {
            $io->warning('No database dumps found in the backup bucket.');

            return;
        }

        krsort($dumps);

        $table = new Table($io);
        $table->setHeaders(['Timestamp / Key', 'Size', 'Last Modified']);

        foreach ($dumps as $key => $meta) {
            $stamp = str_replace([self::DATABASE_PREFIX . 'burgieclan-', '.dump'], '', $key);
            $table->addRow([$stamp, $this->formatBytes($meta['size']), $meta['mtime']]);
        }

        $table->render();
    }

    /**
     * Resolves which dump key to restore.
     */
    private function resolveTargetDump(S3Client $client, string $bucket, ?string $stamp): string
    {
        $dumps = array_keys($this->listObjectMetadata($client, $bucket, self::DATABASE_PREFIX));
        if ($dumps === []) {
            throw new RuntimeException('No database dumps found in the backup bucket.');
        }

        if ($stamp === null || $stamp === '') {
            sort($dumps);

            return (string)end($dumps);
        }

        // Exact match
        if (in_array($stamp, $dumps, true)) {
            return $stamp;
        }

        // Timestamp match e.g. 2026-08-22T19-35-24
        $key = self::DATABASE_PREFIX . sprintf('burgieclan-%s.dump', $stamp);
        if (in_array($key, $dumps, true)) {
            return $key;
        }

        throw new RuntimeException(sprintf('Specified backup "%s" was not found in bucket.', $stamp));
    }

    /**
     * Downloads and restores a database dump.
     *
     * @param array{database_url: string, source: array<string, string>, backup: array<string, string>} $config
     */
    private function restoreDatabase(
        SymfonyStyle $io,
        S3Client $client,
        array $config,
        string $key,
        bool $dryRun
    ): void {
        $io->section('Database restore');

        $file = tempnam(sys_get_temp_dir(), 'burgieclan-restore-');
        if ($file === false) {
            throw new RuntimeException('Could not create a temporary file for downloading the dump.');
        }

        try {
            $io->text(sprintf('downloading %s...', $key));
            $client->getObject(
                [
                'Bucket' => $config['backup']['bucket'],
                'Key' => $key,
                'SaveAs' => $file,
                ]
            );

            $this->assertValidDump($file);
            $size = filesize($file) ?: 0;
            $io->text(sprintf('downloaded %s (%s), verified PGDMP header', $key, $this->formatBytes($size)));

            $dsn = $this->parseDatabaseUrl($config['database_url']);

            if ($dryRun) {
                $tocEntries = $this->verifyDumpToc($file);
                $io->text(sprintf('verified archive TOC: %d valid objects found', $tocEntries));
                $io->note(sprintf('Dry run: would run pg_restore into database "%s"', $dsn['dbname']));

                return;
            }

            $io->text(sprintf('restoring into %s...', $dsn['dbname']));
            $this->runPgRestore($dsn, $file);
            $io->text(sprintf('successfully restored %s into %s', $key, $dsn['dbname']));
        } finally {
            @unlink($file);
        }
    }

    /**
     * Runs pg_restore with --clean and --if-exists.
     *
     * @param array<string, string> $dsn
     */
    private function runPgRestore(array $dsn, string $file): void
    {
        $command = [
            'pg_restore',
            '--host=' . $dsn['host'],
            '--port=' . $dsn['port'],
            '--username=' . $dsn['user'],
            '--dbname=' . $dsn['dbname'],
            '--clean',
            '--if-exists',
            '--no-password',
            $file,
        ];

        $descriptors = [
            0 => ['file', '/dev/null', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];

        $process = proc_open($command, $descriptors, $pipes, null, ['PGPASSWORD' => $dsn['password']]);
        if (!is_resource($process)) {
            throw new RuntimeException('Could not start pg_restore. Is postgresql-client installed in this image?');
        }

        $stdout = stream_get_contents($pipes[1]) ?: '';
        $stderr = stream_get_contents($pipes[2]) ?: '';
        fclose($pipes[1]);
        fclose($pipes[2]);
        $status = proc_close($process);

        // pg_restore exit status: 0 = success, 1 = warnings (e.g. drop table when table didn't exist), >1 = errors
        if ($status > 1) {
            throw new RuntimeException(sprintf('pg_restore failed (exit %d): %s', $status, trim($stderr)));
        }
    }

    /**
     * Verifies the archive TOC using pg_restore --list.
     */
    private function verifyDumpToc(string $file): int
    {
        $command = ['pg_restore', '--list', $file];
        $descriptors = [
            0 => ['file', '/dev/null', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];

        $process = proc_open($command, $descriptors, $pipes);
        if (!is_resource($process)) {
            throw new RuntimeException('Could not run pg_restore --list to inspect archive.');
        }

        $stdout = stream_get_contents($pipes[1]) ?: '';
        $stderr = stream_get_contents($pipes[2]) ?: '';
        fclose($pipes[1]);
        fclose($pipes[2]);
        $status = proc_close($process);

        if ($status !== 0) {
            throw new RuntimeException(sprintf('Archive TOC verification failed: %s', trim($stderr)));
        }

        $lines = array_filter(explode("\n", trim($stdout)), static fn($l) => $l !== '' && !str_starts_with($l, ';'));

        return count($lines);
    }

    /**
     * Restores missing document files from the backup bucket to the source bucket.
     *
     * @param array{database_url: string, source: array<string, string>, backup: array<string, string>} $config
     */
    private function restoreDocuments(
        SymfonyStyle $io,
        S3Client $backupClient,
        S3Client $sourceClient,
        array $config,
        bool $sameStore,
        bool $dryRun
    ): void {
        $io->section('Documents restore');

        $existingSource = $this->listObjectSizes($sourceClient, $config['source']['bucket'], self::DOCUMENTS_PREFIX);
        $copied = 0;
        $skipped = 0;
        $bytes = 0;

        $pages = $backupClient->getPaginator(
            'ListObjectsV2',
            [
            'Bucket' => $config['backup']['bucket'],
            'Prefix' => self::DOCUMENTS_PREFIX,
            ]
        );

        foreach ($pages as $page) {
            foreach ($page['Contents'] ?? [] as $object) {
                $key = (string)$object['Key'];
                $size = (int)$object['Size'];

                if (isset($existingSource[$key]) && $existingSource[$key] === $size) {
                    $skipped++;
                    continue;
                }

                if (!$dryRun) {
                    if ($sameStore) {
                        $sourceClient->copyObject(
                            [
                            'Bucket' => $config['source']['bucket'],
                            'Key' => $key,
                            'CopySource' => rawurlencode($config['backup']['bucket'] . '/' . $key),
                            ]
                        );
                    } else {
                        $this->streamObject(
                            $backupClient,
                            $sourceClient,
                            $config['backup']['bucket'],
                            $config['source']['bucket'],
                            $key
                        );
                    }
                }

                $copied++;
                $bytes += $size;

                if ($copied % 250 === 0) {
                    $io->text(sprintf('  ... %d restored (%s)', $copied, $this->formatBytes($bytes)));
                }
            }
        }

        $io->text(
            sprintf(
                '%s %d document(s) (%s), %d already present in source bucket',
                $dryRun ? 'would restore' : 'restored',
                $copied,
                $this->formatBytes($bytes),
                $skipped
            )
        );
    }

    private function streamObject(
        S3Client $fromClient,
        S3Client $toClient,
        string $fromBucket,
        string $toBucket,
        string $key
    ): void {
        $result = $fromClient->getObject(
            [
            'Bucket' => $fromBucket,
            'Key' => $key,
            '@http' => ['stream' => true],
            ]
        );

        $toClient->upload($toBucket, $key, $result['Body']);
    }

    /**
     * @return array<string, array{size: int, mtime: string}>
     */
    private function listObjectMetadata(S3Client $client, string $bucket, string $prefix): array
    {
        $objects = [];
        $pages = $client->getPaginator('ListObjectsV2', ['Bucket' => $bucket, 'Prefix' => $prefix]);

        foreach ($pages as $page) {
            foreach ($page['Contents'] ?? [] as $object) {
                $key = (string)$object['Key'];
                $objects[$key] = [
                    'size' => (int)$object['Size'],
                    'mtime' => (string)($object['LastModified'] ?? ''),
                ];
            }
        }

        return $objects;
    }

    /**
     * @return array<string, int>
     */
    private function listObjectSizes(S3Client $client, string $bucket, string $prefix): array
    {
        $sizes = [];
        $pages = $client->getPaginator('ListObjectsV2', ['Bucket' => $bucket, 'Prefix' => $prefix]);

        foreach ($pages as $page) {
            foreach ($page['Contents'] ?? [] as $object) {
                $sizes[(string)$object['Key']] = (int)$object['Size'];
            }
        }

        return $sizes;
    }

    private function assertValidDump(string $file): void
    {
        if ((filesize($file) ?: 0) === 0) {
            throw new RuntimeException('Dump file is empty.');
        }

        $handle = fopen($file, 'rb');
        if ($handle === false) {
            throw new RuntimeException('Could not open the dump file.');
        }

        $magic = fread($handle, strlen(self::PGDUMP_MAGIC));
        fclose($handle);

        if ($magic !== self::PGDUMP_MAGIC) {
            throw new RuntimeException('The dump is not a valid PostgreSQL custom-format archive.');
        }
    }

    /**
     * Reads and validates the environment.
     *
     * @return array{database_url: string, source: array<string, string>, backup: array<string, string>}
     */
    private function readConfiguration(): array
    {
        $required = [
            'DATABASE_URL',
            'S3_ENDPOINT',
            'S3_REGION',
            'S3_ACCESS_KEY',
            'S3_SECRET_KEY',
            'S3_BUCKET',
            'S3_BACKUP_BUCKET',
        ];

        $missing = [];
        foreach ($required as $var) {
            if ($this->env($var) === null) {
                $missing[] = $var;
            }
        }

        if ($missing !== []) {
            throw new RuntimeException(sprintf('Missing environment variables: %s', implode(', ', $missing)));
        }

        $source = [
            'endpoint' => (string)$this->env('S3_ENDPOINT'),
            'region' => (string)$this->env('S3_REGION'),
            'key' => (string)$this->env('S3_ACCESS_KEY'),
            'secret' => (string)$this->env('S3_SECRET_KEY'),
            'bucket' => (string)$this->env('S3_BUCKET'),
        ];

        $backup = [
            'endpoint' => $this->env('S3_BACKUP_ENDPOINT') ?? $source['endpoint'],
            'region' => $this->env('S3_BACKUP_REGION') ?? $source['region'],
            'key' => $this->env('S3_BACKUP_ACCESS_KEY') ?? $source['key'],
            'secret' => $this->env('S3_BACKUP_SECRET_KEY') ?? $source['secret'],
            'bucket' => (string)$this->env('S3_BACKUP_BUCKET'),
        ];

        return ['database_url' => (string)$this->env('DATABASE_URL'), 'source' => $source, 'backup' => $backup];
    }

    private function env(string $name): ?string
    {
        $value = $_ENV[$name] ?? $_SERVER[$name] ?? getenv($name);

        return is_string($value) && $value !== '' ? $value : null;
    }

    /**
     * @param array<string, string> $store
     */
    private function createClient(array $store): S3Client
    {
        return new S3Client(
            [
            'version' => 'latest',
            'region' => $store['region'],
            'endpoint' => $store['endpoint'],
            'use_path_style_endpoint' => true,
            'credentials' => [
                'key' => $store['key'],
                'secret' => $store['secret'],
            ],
            ]
        );
    }

    /**
     * @return array<string, string>
     */
    private function parseDatabaseUrl(string $url): array
    {
        $parts = parse_url($url);
        if ($parts === false || !isset($parts['host'], $parts['path'])) {
            throw new RuntimeException('DATABASE_URL could not be parsed.');
        }

        return [
            'host' => $parts['host'],
            'port' => (string)($parts['port'] ?? 5432),
            'user' => urldecode($parts['user'] ?? ''),
            'password' => urldecode($parts['pass'] ?? ''),
            'dbname' => ltrim($parts['path'], '/'),
        ];
    }

    private function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $power = $bytes > 0 ? (int)floor(log($bytes, 1024)) : 0;
        $power = min($power, count($units) - 1);

        return sprintf('%.1f %s', $bytes / (1024 ** $power), $units[$power]);
    }
}
