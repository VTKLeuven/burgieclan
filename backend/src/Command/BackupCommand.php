<?php

namespace App\Command;

use Aws\S3\S3Client;
use JsonException;
use RuntimeException;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Backs up the database and the uploaded document files to a separate S3 bucket.
 *
 * Two things are worth protecting and they live in different places:
 *
 *  - the database, which holds every program, module, course, document row,
 *    comment, vote and user, and
 *  - the document *files*, which in production are not on the server at all but
 *    in object storage (see flysystem.yaml, when@prod).
 *
 * Server-local files are deliberately not backed up. `data/exports` is a cache of
 * generated zips that DeleteOldZipsCommand prunes after seven days, and
 * `data/temp-uploads` holds uploads still in flight. Both are derived or
 * transient, so restoring them would at best do nothing.
 *
 * The JWT keys and .env are also excluded on purpose. They change almost never
 * and are tiny, so including them in a routine backup would multiply the number
 * of copies of your secrets for no benefit. Escrow them once, by hand, in the
 * password manager instead.
 *
 * Usage:
 *
 *     php bin/console app:backup                 # database + documents
 *     php bin/console app:backup --dry-run       # report only, write nothing
 *     php bin/console app:backup --skip-documents
 *     php bin/console app:backup --keep=30       # prune older dumps
 */
#[AsCommand(
    name: 'app:backup',
    description: 'Back up the database and document files to the backup bucket',
)]
class BackupCommand extends Command
{
    /** Object key prefixes inside the backup bucket. */
    private const DATABASE_PREFIX = 'database/';
    private const DOCUMENTS_PREFIX = 'documents/';
    private const MANIFEST_PREFIX = 'manifests/';

    /** Custom-format pg_dump archives start with this magic string. */
    private const PGDUMP_MAGIC = 'PGDMP';

    protected function configure(): void
    {
        $this
            ->addOption('dry-run', null, InputOption::VALUE_NONE, 'Report what would happen, write nothing')
            ->addOption('skip-database', null, InputOption::VALUE_NONE, 'Do not dump the database')
            ->addOption('skip-documents', null, InputOption::VALUE_NONE, 'Do not copy document files')
            ->addOption(
                'keep',
                null,
                InputOption::VALUE_REQUIRED,
                'Number of database dumps to retain (0 keeps all)',
                '30'
            );
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $dryRun = (bool)$input->getOption('dry-run');

        try {
            $config = $this->readConfiguration();
        } catch (RuntimeException $e) {
            $io->error($e->getMessage());

            return Command::FAILURE;
        }

        $sameStore = $config['source']['endpoint'] === $config['backup']['endpoint'];

        $io->title('Burgieclan backup');
        $io->definitionList(
            ['documents' => sprintf('%s @ %s', $config['source']['bucket'], $config['source']['endpoint'])],
            ['backup' => sprintf('%s @ %s', $config['backup']['bucket'], $config['backup']['endpoint'])],
            ['copy mode' => $sameStore ? 'server-side' : 'streamed (different locations)'],
        );

        if ($dryRun) {
            $io->note('Dry run - nothing will be written.');
        }

        $sourceClient = $this->createClient($config['source']);
        $backupClient = $sameStore ? $sourceClient : $this->createClient($config['backup']);
        $stamp = date('Y-m-d\TH-i-s');
        $manifest = ['taken_at' => date('c'), 'dry_run' => $dryRun];

        try {
            if (!$input->getOption('skip-database')) {
                $manifest['database'] = $this->backupDatabase($io, $backupClient, $config, $stamp, $dryRun);
            }

            if (!$input->getOption('skip-documents')) {
                $manifest['documents'] = $this->backupDocuments(
                    $io,
                    $sourceClient,
                    $backupClient,
                    $config,
                    $sameStore,
                    $dryRun
                );
            }

            // Rotate only after a new dump was actually written. Pruning when no
            // fresh backup exists is how a failed run turns into data loss.
            $keep = (int)$input->getOption('keep');
            if ($keep > 0 && !$input->getOption('skip-database')) {
                $manifest['pruned'] = $this->pruneOldDumps($io, $backupClient, $config, $keep, $dryRun);
            } elseif ($keep > 0) {
                $io->note('--keep ignored: retention only runs when a new dump was written.');
            }

            if (!$dryRun) {
                $this->writeManifest($backupClient, $config, $stamp, $manifest);
            }
        } catch (RuntimeException $e) {
            $io->error($e->getMessage());

            return Command::FAILURE;
        }

        $io->success(sprintf('Backup complete (%s).', $stamp));

        return Command::SUCCESS;
    }

    /**
     * Reads and validates the environment.
     *
     * Deliberately read at runtime rather than injected: these variables only
     * exist in production (see flysystem.yaml, when@prod), and autowiring them
     * would make the service container fail to build in dev and test.
     *
     * The backup store falls back to the documents store for every setting
     * except the bucket, so the common case needs only S3_BACKUP_BUCKET. Set
     * S3_BACKUP_ENDPOINT / S3_BACKUP_REGION when the backup lives in another
     * location - Hetzner keys are valid project-wide, so the credentials
     * usually still carry over.
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

        // Same bucket in the same place is not a backup, it is the original.
        if ($source['endpoint'] === $backup['endpoint'] && $source['bucket'] === $backup['bucket']) {
            throw new RuntimeException(
                'S3_BACKUP_BUCKET must differ from S3_BUCKET, otherwise the backup shares the fate of the original.'
            );
        }

        return ['database_url' => (string)$this->env('DATABASE_URL'), 'source' => $source, 'backup' => $backup];
    }

    /**
     * Returns the environment variable, or null when unset or empty.
     */
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
     * Dumps the database with pg_dump and uploads the archive.
     *
     * @param array{database_url: string, source: array<string, string>, backup: array<string, string>} $config
     *
     * @return array<string, mixed>
     */
    private function backupDatabase(
        SymfonyStyle $io,
        S3Client $client,
        array $config,
        string $stamp,
        bool $dryRun
    ): array {
        $io->section('Database');

        $dsn = $this->parseDatabaseUrl($config['database_url']);
        $key = self::DATABASE_PREFIX . sprintf('burgieclan-%s.dump', $stamp);

        if ($dryRun) {
            $io->text(sprintf('would dump %s and upload to %s', $dsn['dbname'], $key));

            return ['key' => $key, 'skipped' => 'dry-run'];
        }

        $file = tempnam(sys_get_temp_dir(), 'burgieclan-dump-');
        if ($file === false) {
            throw new RuntimeException('Could not create a temporary file for the dump.');
        }

        try {
            $this->runPgDump($dsn, $file);
            $this->assertValidDump($file);

            $size = filesize($file) ?: 0;
            $io->text(sprintf('dumped %s (%s)', $dsn['dbname'], $this->formatBytes($size)));

            $handle = fopen($file, 'rb');
            if ($handle === false) {
                throw new RuntimeException('Could not reopen the dump for upload.');
            }

            $client->putObject(
                [
                'Bucket' => $config['backup']['bucket'],
                'Key' => $key,
                'Body' => $handle,
                ]
            );

            if (is_resource($handle)) {
                fclose($handle);
            }

            $io->text(sprintf('uploaded to %s', $key));

            return ['key' => $key, 'bytes' => $size, 'sha256' => hash_file('sha256', $file)];
        } finally {
            @unlink($file);
        }
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

    /**
     * Runs pg_dump, writing a custom-format archive to $file.
     *
     * Uses proc_open rather than symfony/process: that component is a dev-only
     * dependency here and is absent from the production image.
     *
     * @param array<string, string> $dsn
     */
    private function runPgDump(array $dsn, string $file): void
    {
        $command = [
            'pg_dump',
            '--host=' . $dsn['host'],
            '--port=' . $dsn['port'],
            '--username=' . $dsn['user'],
            '--dbname=' . $dsn['dbname'],
            '--format=custom',
            '--no-password',
        ];

        $descriptors = [
            0 => ['file', '/dev/null', 'r'],
            1 => ['file', $file, 'w'],
            2 => ['pipe', 'w'],
        ];

        $process = proc_open($command, $descriptors, $pipes, null, ['PGPASSWORD' => $dsn['password']]);
        if (!is_resource($process)) {
            throw new RuntimeException('Could not start pg_dump. Is postgresql-client installed in this image?');
        }

        $stderr = stream_get_contents($pipes[2]) ?: '';
        fclose($pipes[2]);
        $status = proc_close($process);

        if ($status !== 0) {
            throw new RuntimeException(sprintf('pg_dump failed (exit %d): %s', $status, trim($stderr)));
        }
    }

    /**
     * A zero exit code is not proof of a usable archive, so check the file itself.
     */
    private function assertValidDump(string $file): void
    {
        if ((filesize($file) ?: 0) === 0) {
            throw new RuntimeException('pg_dump produced an empty file.');
        }

        $handle = fopen($file, 'rb');
        if ($handle === false) {
            throw new RuntimeException('Could not read the dump back.');
        }

        $magic = fread($handle, strlen(self::PGDUMP_MAGIC));
        fclose($handle);

        if ($magic !== self::PGDUMP_MAGIC) {
            throw new RuntimeException('The dump is not a valid custom-format archive - do not trust it.');
        }
    }

    /**
     * Copies document objects into the backup bucket.
     *
     * Two strategies, chosen by whether both buckets sit on the same endpoint:
     *
     *  - same store: CopyObject, so the storage duplicates the object itself and
     *    the bytes never travel through this process.
     *  - different stores: the object is streamed down and back up. Hetzner runs
     *    each location as a separate cluster, so a nbg1 bucket cannot CopyObject
     *    from a hel1 one. Slower, but that separation is the point of putting the
     *    backup in another datacentre, and the sync is incremental so the cost is
     *    paid once.
     *
     * @param array{database_url: string, source: array<string, string>, backup: array<string, string>} $config
     *
     * @return array<string, int>
     */
    private function backupDocuments(
        SymfonyStyle $io,
        S3Client $sourceClient,
        S3Client $backupClient,
        array $config,
        bool $sameStore,
        bool $dryRun
    ): array {
        $io->section('Documents');

        $existing = $this->listObjectSizes($backupClient, $config['backup']['bucket'], self::DOCUMENTS_PREFIX);
        $copied = 0;
        $skipped = 0;
        $bytes = 0;

        $pages = $sourceClient->getPaginator(
            'ListObjectsV2',
            [
            'Bucket' => $config['source']['bucket'],
            'Prefix' => self::DOCUMENTS_PREFIX,
            ]
        );

        $progress = null;
        foreach ($pages as $page) {
            foreach ($page['Contents'] ?? [] as $object) {
                $key = (string)$object['Key'];
                $size = (int)$object['Size'];

                // Same key, same size: already copied. Cheap and good enough,
                // because document objects are immutable once uploaded.
                if (isset($existing[$key]) && $existing[$key] === $size) {
                    $skipped++;
                    continue;
                }

                if (!$dryRun) {
                    if ($sameStore) {
                        $backupClient->copyObject(
                            [
                            'Bucket' => $config['backup']['bucket'],
                            'Key' => $key,
                            'CopySource' => rawurlencode($config['source']['bucket'] . '/' . $key),
                            ]
                        );
                    } else {
                        $this->streamObject($sourceClient, $backupClient, $config, $key);
                    }
                }

                $copied++;
                $bytes += $size;

                if ($copied % 250 === 0) {
                    $io->text(sprintf('  ... %d copied (%s)', $copied, $this->formatBytes($bytes)));
                }
            }
        }

        $io->text(
            sprintf(
                '%s %d object(s) (%s), %d already present',
                $dryRun ? 'would copy' : 'copied',
                $copied,
                $this->formatBytes($bytes),
                $skipped
            )
        );

        return ['copied' => $copied, 'skipped' => $skipped, 'bytes' => $bytes];
    }

    /**
     * Streams a single object between two stores without buffering it in memory.
     *
     * `upload()` promotes to a multipart upload on its own once the body is large
     * enough, which matters because individual documents can be hundreds of MB.
     *
     * @param array{database_url: string, source: array<string, string>, backup: array<string, string>} $config
     */
    private function streamObject(S3Client $sourceClient, S3Client $backupClient, array $config, string $key): void
    {
        $result = $sourceClient->getObject(
            [
            'Bucket' => $config['source']['bucket'],
            'Key' => $key,
            '@http' => ['stream' => true],
            ]
        );

        $backupClient->upload($config['backup']['bucket'], $key, $result['Body']);
    }

    /**
     * @return array<string, int> key => size
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

    /**
     * Deletes the oldest dumps beyond the retention count.
     *
     * Keys embed a sortable timestamp, so lexical order is chronological order.
     *
     * @param array{database_url: string, source: array<string, string>, backup: array<string, string>} $config
     *
     * @return array<int, string>
     */
    private function pruneOldDumps(
        SymfonyStyle $io,
        S3Client $client,
        array $config,
        int $keep,
        bool $dryRun
    ): array {
        $keys = array_keys($this->listObjectSizes($client, $config['backup']['bucket'], self::DATABASE_PREFIX));
        sort($keys);

        $stale = array_slice($keys, 0, max(0, count($keys) - $keep));
        foreach ($stale as $key) {
            if (!$dryRun) {
                $client->deleteObject(['Bucket' => $config['backup']['bucket'], 'Key' => $key]);
            }
            $io->text(sprintf('%s %s', $dryRun ? 'would prune' : 'pruned', $key));
        }

        return $stale;
    }

    /**
     * @param array{database_url: string, source: array<string, string>, backup: array<string, string>} $config
     * @param array<string, mixed> $manifest
     */
    private function writeManifest(S3Client $client, array $config, string $stamp, array $manifest): void
    {
        try {
            $body = json_encode($manifest, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR);
        } catch (JsonException $e) {
            throw new RuntimeException('Could not encode the manifest: ' . $e->getMessage(), 0, $e);
        }

        $client->putObject(
            [
            'Bucket' => $config['backup']['bucket'],
            'Key' => self::MANIFEST_PREFIX . $stamp . '.json',
            'Body' => $body,
            'ContentType' => 'application/json',
            ]
        );
    }

    private function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $power = $bytes > 0 ? (int)floor(log($bytes, 1024)) : 0;
        $power = min($power, count($units) - 1);

        return sprintf('%.1f %s', $bytes / (1024 ** $power), $units[$power]);
    }
}
