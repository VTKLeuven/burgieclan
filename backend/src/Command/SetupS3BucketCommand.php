<?php

namespace App\Command;

use Aws\S3\Exception\S3Exception;
use Aws\S3\S3Client;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * Prepares the document bucket: creates it if it is missing and applies the CORS
 * rules the frontend needs to preview files straight from the bucket.
 *
 * Downloads redirect the browser to a pre-signed bucket URL, and the PDF viewer
 * fetches that URL from JavaScript (with range requests), so the bucket has to
 * allow the frontend's origin. Keeping those rules here instead of clicking them
 * together in a provider console makes them reproducible on any S3-compatible
 * store: the local SeaweedFS container, Hetzner, or a self-hosted bucket.
 *
 *     php bin/console app:s3:setup-bucket
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
        #[Autowire(env: 'S3_BUCKET')]
        private readonly string $bucket,
        #[Autowire(env: 'FRONTEND_URL')]
        private readonly string $frontendUrl,
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
            ->addOption('skip-cors', null, InputOption::VALUE_NONE, 'Only create the bucket');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        if ('' === $this->bucket) {
            $io->error('S3_BUCKET is not set.');

            return Command::FAILURE;
        }

        if ($this->s3Client->doesBucketExistV2($this->bucket, false)) {
            $io->writeln(sprintf('Bucket "%s" already exists.', $this->bucket));
        } else {
            $this->s3Client->createBucket(['Bucket' => $this->bucket]);
            $this->s3Client->waitUntil('BucketExists', ['Bucket' => $this->bucket]);
            $io->writeln(sprintf('Created bucket "%s".', $this->bucket));
        }

        if ($input->getOption('skip-cors')) {
            return Command::SUCCESS;
        }

        /** @var string[] $origins */
        $origins = $input->getOption('origin') ?: [rtrim($this->frontendUrl, '/')];

        try {
            $this->s3Client->putBucketCors([
                'Bucket' => $this->bucket,
                'CORSConfiguration' => [
                    'CORSRules' => [
                        [
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
            ]);
        } catch (S3Exception $e) {
            $io->error(sprintf('Could not apply CORS rules: %s', $e->getAwsErrorMessage() ?? $e->getMessage()));

            return Command::FAILURE;
        }

        $io->success(sprintf('CORS rules applied for: %s', implode(', ', $origins)));

        return Command::SUCCESS;
    }
}
