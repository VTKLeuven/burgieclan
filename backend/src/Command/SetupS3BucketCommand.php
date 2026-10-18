<?php

namespace App\Command;

use App\Constants\ZipExport;
use Aws\S3\Exception\S3Exception;
use Aws\S3\S3Client;
use League\Flysystem\FilesystemOperator;
use League\Flysystem\StorageAttributes;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\DependencyInjection\Attribute\Target;

/**
 * Prepares the document bucket: creates it if it is missing, applies the CORS rules
 * the frontend needs to preview files straight from the bucket, and adds a lifecycle
 * rule that deletes generated zips (exports/) after ZipExport::MAX_AGE_DAYS.
 *
 * The PDF viewer fetches pre-signed bucket URLs from JavaScript, so the bucket has
 * to allow the frontend's origin. Every deploy runs this command, which adds that
 * environment's FRONTEND_URL. Keeping those rules
 * here instead of clicking them together in a provider console makes them
 * reproducible on any S3-compatible store: the local SeaweedFS container, Hetzner,
 * or a self-hosted bucket.
 *
 * --sync-local copies the files in backend/data/documents into the bucket, so the
 * fixture documents from `make db` open when a development setup switches to
 * DOCUMENT_STORAGE=s3. It only ever adds missing files and refuses to run in prod.
 *
 *     php bin/console app:s3:setup-bucket
 *     php bin/console app:s3:setup-bucket --sync-local
 *     php bin/console app:s3:setup-bucket --origin=https://burgieclan.vtk.be --origin=https://dev.burgieclan.vtk.be
 */
#[AsCommand(
    name: 'app:s3:setup-bucket',
    description: 'Creates the document bucket if needed and applies its CORS rules'
)]
final class SetupS3BucketCommand extends Command
{
    public function __construct(
        #[Autowire(service: 's3_client')]
        private readonly S3Client $s3Client,
        #[Target('documents.local')]
        private readonly FilesystemOperator $localDocuments,
        #[Target('documents.s3')]
        private readonly FilesystemOperator $bucketDocuments,
        #[Autowire(env: 'S3_BUCKET')]
        private readonly string $bucket,
        #[Autowire(env: 'FRONTEND_URL')]
        private readonly string $frontendUrl,
        #[Autowire('%kernel.environment%')]
        private readonly string $environment,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addOption(
                'origin',
                null,
                InputOption::VALUE_REQUIRED | InputOption::VALUE_IS_ARRAY,
                'Origin allowed to read from the bucket (repeatable). Defaults to FRONTEND_URL.'
            )
            ->addOption('skip-cors', null, InputOption::VALUE_NONE, 'Do not touch the CORS rules')
            ->addOption(
                'sync-local',
                null,
                InputOption::VALUE_NONE,
                'Development only: upload files from data/documents that are missing in the bucket'
            );
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        if ('' === $this->bucket) {
            $io->error('S3_BUCKET is not set.');

            return Command::FAILURE;
        }

        // Checked before touching anything: the production bucket is the source of truth,
        // and whatever sits in a server's data/documents must never be pushed into it.
        if ($input->getOption('sync-local') && 'prod' === $this->environment) {
            $io->error('--sync-local is for development setups only and refuses to run with APP_ENV=prod.');

            return Command::FAILURE;
        }

        if ($this->s3Client->doesBucketExistV2($this->bucket, false)) {
            $io->writeln(sprintf('Bucket "%s" already exists.', $this->bucket));
        } else {
            $this->s3Client->createBucket(['Bucket' => $this->bucket]);
            $this->s3Client->waitUntil('BucketExists', ['Bucket' => $this->bucket]);
            $io->writeln(sprintf('Created bucket "%s".', $this->bucket));
        }

        if (!$input->getOption('skip-cors')) {
            /** @var string[] $origins */
            $origins = $input->getOption('origin') ?: [rtrim($this->frontendUrl, '/')];

            if (!$this->applyCors($io, $origins)) {
                return Command::FAILURE;
            }
        }

        $this->applyZipExpiry($io);

        if ($input->getOption('sync-local')) {
            $this->syncLocalDocuments($io);
        }

        return Command::SUCCESS;
    }

    /**
     * Adds the origins to our CORS rule.
     *
     * Like the lifecycle rules below, a bucket has a single CORS configuration, so the existing
     * rules are read first: rules set up by hand survive, and the origins our rule already allows
     * are kept, so a run for one environment never locks out another. Removing an origin is
     * left to the provider's console.
     *
     * @param string[] $origins
     */
    private function applyCors(SymfonyStyle $io, array $origins): bool
    {
        $ruleId = 'burgieclan-frontend';

        try {
            try {
                $rules = $this->s3Client->getBucketCors(['Bucket' => $this->bucket])['CORSRules'] ?? [];
            } catch (S3Exception $e) {
                if ('NoSuchCORSConfiguration' !== $e->getAwsErrorCode()) {
                    throw $e;
                }
                $rules = [];
            }

            $otherRules = [];
            foreach ($rules as $rule) {
                if (($rule['ID'] ?? null) === $ruleId) {
                    $origins = [...$rule['AllowedOrigins'] ?? [], ...$origins];
                } else {
                    $otherRules[] = $rule;
                }
            }
            $origins = array_values(array_unique($origins));

            $this->s3Client->putBucketCors(
                [
                'Bucket' => $this->bucket,
                'CORSConfiguration' => [
                    'CORSRules' => [
                        ...$otherRules,
                        [
                            'ID' => $ruleId,
                            'AllowedOrigins' => $origins,
                            'AllowedMethods' => ['GET', 'HEAD'],
                            'AllowedHeaders' => ['*'],
                            'ExposeHeaders' => [
                                'Content-Disposition',
                                'Content-Length',
                                'Content-Type',
                                'Accept-Ranges',
                                'Content-Range',
                            ],
                            'MaxAgeSeconds' => 3600,
                        ],
                    ],
                ],
                ]
            );
        } catch (S3Exception $e) {
            $io->error(sprintf('Could not apply CORS rules: %s', $e->getAwsErrorMessage() ?? $e->getMessage()));

            return false;
        }

        $io->success(sprintf('CORS rules allow: %s', implode(', ', $origins)));

        return true;
    }

    /**
     * Lets the bucket delete old zips by itself, so no cron job has to run app:delete-old-zips.
     *
     * A bucket has a single lifecycle configuration, so the existing rules are read first and
     * only the rule with our ID is replaced; rules set up by hand survive. Not every S3
     * implementation supports lifecycle rules: then this warns and app:delete-old-zips has to
     * be scheduled instead.
     */
    private function applyZipExpiry(SymfonyStyle $io): void
    {
        $ruleId = 'burgieclan-expire-zip-exports';

        try {
            try {
                $rules = $this->s3Client->getBucketLifecycleConfiguration(['Bucket' => $this->bucket])['Rules'] ?? [];
            } catch (S3Exception $e) {
                if ('NoSuchLifecycleConfiguration' !== $e->getAwsErrorCode()) {
                    throw $e;
                }
                $rules = [];
            }

            $rules = array_values(array_filter($rules, fn (array $rule) => ($rule['ID'] ?? null) !== $ruleId));
            $rules[] = [
                'ID' => $ruleId,
                'Status' => 'Enabled',
                'Filter' => ['Prefix' => ZipExport::BUCKET_PREFIX],
                'Expiration' => ['Days' => ZipExport::MAX_AGE_DAYS],
            ];

            $this->s3Client->putBucketLifecycleConfiguration(
                [
                'Bucket' => $this->bucket,
                'LifecycleConfiguration' => ['Rules' => $rules],
                ]
            );
        } catch (S3Exception $e) {
            $io->warning(
                sprintf(
                    'Could not set the lifecycle rule for old zips (%s). Schedule app:delete-old-zips instead.',
                    $e->getAwsErrorMessage() ?? $e->getMessage()
                )
            );

            return;
        }

        $io->success(
            sprintf(
                'Zips under %s expire after %d days.',
                ZipExport::BUCKET_PREFIX,
                ZipExport::MAX_AGE_DAYS
            )
        );
    }

    private function syncLocalDocuments(SymfonyStyle $io): void
    {
        $uploaded = 0;
        $skipped = 0;

        $files = $this->localDocuments->listContents('', true)
            ->filter(fn (StorageAttributes $item) => $item->isFile() && !str_starts_with(basename($item->path()), '.'));

        foreach ($files as $file) {
            $path = $file->path();

            if ($this->bucketDocuments->fileExists($path)) {
                ++$skipped;
                continue;
            }

            $stream = $this->localDocuments->readStream($path);
            try {
                $this->bucketDocuments->writeStream($path, $stream);
            } finally {
                if (is_resource($stream)) {
                    fclose($stream);
                }
            }
            ++$uploaded;
        }

        $io->success(sprintf('Uploaded %d local document(s); %d were already in the bucket.', $uploaded, $skipped));
    }
}
