<?php

namespace App\Command;

use App\Service\Exchange\AthensCatalogue;
use App\Service\Exchange\AthensRegister;
use InvalidArgumentException;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Brings the ATHENS courses in line with resources/athens/catalogue.json (AthensCatalogue).
 * Courses that left the catalogue are hidden, not deleted; their reviews stay. Running it again
 * on the same file changes nothing, so the deploy runs it every time.
 *
 * Afterwards it copies resources/athens/register.json onto the courses (AthensRegister): the link to
 * each course's page on the ATHENS registration platform, what that page says, and whether the course
 * is on the list of the session open there.
 *
 *     php bin/console app:exchange:import-athens --dry-run
 *     php bin/console app:exchange:import-athens
 */
#[AsCommand(
    name: 'app:exchange:import-athens',
    description: 'Updates the ATHENS courses from the catalogue file; dropped courses are hidden',
)]
final class ImportAthensCatalogueCommand extends Command
{
    public function __construct(
        private readonly AthensCatalogue $catalogue,
        private readonly AthensRegister $register,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addArgument('file', InputArgument::OPTIONAL, 'Another catalogue file than resources/athens/catalogue.json')
            ->addOption('dry-run', null, InputOption::VALUE_NONE, 'Show what would change without storing it');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $file = $input->getArgument('file');
        $dryRun = (bool) $input->getOption('dry-run');

        try {
            $catalogue = $this->catalogue->read(is_string($file) ? $file : null);
        } catch (InvalidArgumentException $exception) {
            $io->error($exception->getMessage());

            return Command::FAILURE;
        }

        try {
            $register = null === $file ? $this->register->read() : null;
        } catch (InvalidArgumentException $exception) {
            $io->error($exception->getMessage());

            return Command::FAILURE;
        }

        // In a dry run nothing is stored, so the register is only applied for real.
        $result = $this->catalogue->import($catalogue, $dryRun);

        foreach (['added' => 'New', 'returned' => 'Back in the catalogue', 'updated' => 'Changed', 'hidden' => 'Hidden (no longer in the catalogue)'] as $key => $title) {
            if ([] !== $result[$key] && ($output->isVerbose() || 'updated' !== $key)) {
                $io->section(sprintf('%s: %d', $title, count($result[$key])));
                $io->listing($result[$key]);
            }
        }

        $summary = sprintf(
            'ATHENS %s: %d new, %d back, %d changed, %d hidden, %d unchanged.',
            $catalogue['edition'],
            count($result['added']),
            count($result['returned']),
            count($result['updated']),
            count($result['hidden']),
            $result['unchanged']
        );
        if (null !== $register && !$dryRun) {
            $applied = $this->register->apply($register);
            if ([] !== $applied['unknown']) {
                $io->section(sprintf('In register.json but not among the courses: %d', count($applied['unknown'])));
                $io->listing($applied['unknown']);
            }
            $summary .= sprintf(' Registration platform (%s): %d courses on the list.', $register['session'], $applied['linked']);
        }
        $dryRun ? $io->note('Dry run, nothing stored. ' . $summary) : $io->success($summary);

        return Command::SUCCESS;
    }
}
