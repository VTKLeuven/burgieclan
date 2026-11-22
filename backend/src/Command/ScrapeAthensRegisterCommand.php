<?php

namespace App\Command;

use App\Service\Exchange\AthensCatalogue;
use App\Service\Exchange\AthensRegister;
use InvalidArgumentException;
use RuntimeException;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Reads the ATHENS registration platform (AthensRegister) and writes what it found to
 * resources/athens/register.json: which catalogue course each course on the list there is, with
 * its page. Run it when a new session's list goes up (September for November, January for March),
 * check the unrecognised ones, commit the file; the next deploy imports it.
 *
 *     php bin/console app:exchange:scrape-athens-register --dry-run
 *     php bin/console app:exchange:scrape-athens-register
 */
#[AsCommand(
    name: 'app:exchange:scrape-athens-register',
    description: 'Reads the courses of the ATHENS registration platform into resources/athens/register.json',
)]
final class ScrapeAthensRegisterCommand extends Command
{
    public function __construct(
        private readonly AthensCatalogue $catalogue,
        private readonly AthensRegister $register,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addOption('dry-run', null, InputOption::VALUE_NONE, 'Show what it found without writing the file');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        try {
            $catalogue = $this->catalogue->read();
        } catch (InvalidArgumentException $exception) {
            $io->error($exception->getMessage());

            return Command::FAILURE;
        }

        $bar = null;
        try {
            $snapshot = $this->register->scrape(
                $catalogue,
                static function (int $done, int $total) use ($io, &$bar): void {
                    $bar ??= $io->createProgressBar($total);
                    $bar->setProgress($done);
                }
            );
        } catch (RuntimeException $exception) {
            $io->error($exception->getMessage());

            return Command::FAILURE;
        }
        $bar?->finish();
        $io->newLine(2);

        $unmatched = array_filter($snapshot['courses'], static fn (array $course): bool => null === $course['match']);
        if ([] !== $unmatched) {
            $io->section(sprintf('Not in the catalogue: %d', count($unmatched)));
            $io->text('Courses of KU Leuven itself are expected here. For another one, check whether the catalogue has it under another code or title; if it is the same university under another name, add that name to its "registerNames" in catalogue.json.');
            $io->listing(array_map(static fn (array $course): string => sprintf('%s · %s (%s)', $course['code'], $course['title'], $course['institution']), $unmatched));
        }
        if ($output->isVerbose()) {
            $matched = array_filter($snapshot['courses'], static fn (array $course): bool => null !== $course['match']);
            $io->section(sprintf('Recognised: %d', count($matched)));
            $io->listing(array_map(static fn (array $course): string => sprintf('%s · %s → %s', $course['code'], $course['title'], (string) $course['match']['code']), $matched));
        }

        $summary = sprintf(
            'Session %s: %d courses on the platform, %d recognised in the catalogue.',
            $snapshot['session'],
            count($snapshot['courses']),
            count($snapshot['courses']) - count($unmatched)
        );
        if ($input->getOption('dry-run')) {
            $io->note('Dry run, nothing written. ' . $summary);

            return Command::SUCCESS;
        }

        file_put_contents($this->register->path(), AthensRegister::dump($snapshot));
        $io->success($summary . ' Written to resources/athens/register.json; run app:exchange:import-athens to show it.');

        return Command::SUCCESS;
    }
}
