<?php

namespace App\Command;

use App\Constants\ExchangeProgram;
use App\Entity\ExchangeReport;
use App\Repository\ExchangeDestinationRepository;
use App\Repository\ExchangeReportRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Imports the exchange experiences from the old VTK wiki, which is no longer online.
 *
 * The file is kept out of the repository on purpose: it holds the names and e-mail addresses
 * students put on the wiki. Pipe it in, so it never has to be inside the container:
 *
 *     docker compose exec -T backend php bin/console app:exchange:import-wiki < exchange-wiki.json
 *
 * The file: {"reports": [{"destination": "ETH Zürich", "academicYear": "2023 - 2024", "phase":
 * "M1", "period": "S1", "program": "BMT", "sections": {"general": "..."}, "courses": [{"name",
 * "code", "equivalent", "text"}], "name": "...", "email": "..."}]}. Everything but "destination"
 * is optional; a row with only a name and an address is a contact without a report. Destinations
 * are matched by name and must exist (`app:exchange:seed-destinations`). Imported reports are
 * approved at once, have no account behind them, and are skipped when they are already there,
 * so the import can be run again.
 */
#[AsCommand(
    name: 'app:exchange:import-wiki',
    description: 'Imports exchange reports from the old VTK wiki (JSON from a file or stdin)',
)]
final class ImportWikiExchangeReportsCommand extends Command
{
    public function __construct(
        private readonly ExchangeDestinationRepository $destinations,
        private readonly ExchangeReportRepository $reports,
        private readonly EntityManagerInterface $entityManager,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addArgument('file', InputArgument::OPTIONAL, 'The JSON file; reads stdin when left out')
            ->addOption('dry-run', null, InputOption::VALUE_NONE, 'Check the file without storing anything');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $file = $input->getArgument('file');
        $json = is_string($file) ? @file_get_contents($file) : stream_get_contents(STDIN);
        $data = is_string($json) ? json_decode($json, true) : null;
        if (!is_array($data) || !is_array($data['reports'] ?? null)) {
            $io->error('Expected a JSON object with a "reports" list.');

            return Command::FAILURE;
        }

        $added = 0;
        $skipped = 0;
        $problems = [];
        foreach ($data['reports'] as $index => $row) {
            $name = is_array($row) && is_string($row['destination'] ?? null) ? $row['destination'] : '';
            $destination = '' !== $name ? $this->destinations->findOneByNameInsensitive($name) : null;
            if (null === $destination) {
                $problems[] = sprintf('#%d: no destination "%s"', $index, $name);
                continue;
            }
            $program = (string) ($row['program'] ?? '');
            if ('' !== $program && null === ExchangeProgram::tryFrom($program)) {
                $problems[] = sprintf('#%d: unknown programme "%s"', $index, $program);
                continue;
            }

            $report = (new ExchangeReport($destination, null))
                ->setAcademicYear((string) ($row['academicYear'] ?? ''))
                ->setPhase((string) ($row['phase'] ?? ''))
                ->setPeriod((string) ($row['period'] ?? ''))
                ->setProgram($program)
                ->setSections(is_array($row['sections'] ?? null) ? $row['sections'] : [])
                ->setCourses(
                    array_values(
                        array_map(
                            static fn (array $course): array => [
                            'name' => (string) ($course['name'] ?? ''),
                            'code' => (string) ($course['code'] ?? ''),
                            'equivalent' => (string) ($course['equivalent'] ?? ''),
                            'text' => (string) ($course['text'] ?? ''),
                            ],
                            array_filter(is_array($row['courses'] ?? null) ? $row['courses'] : [], 'is_array')
                        )
                    )
                )
                ->setLegacyAuthorName(is_string($row['name'] ?? null) && '' !== $row['name'] ? $row['name'] : null)
                ->setLegacyContactEmail(is_string($row['email'] ?? null) && '' !== $row['email'] ? $row['email'] : null)
                ->setUnderReview(false);

            if ($this->alreadyImported($report)) {
                $skipped++;
                continue;
            }
            $this->entityManager->persist($report);
            $added++;
        }

        if (!$input->getOption('dry-run')) {
            $this->entityManager->flush();
        }

        foreach ($problems as $problem) {
            $io->warning($problem);
        }
        $io->success(
            sprintf(
                '%s %d report(s), skipped %d already imported, %d problem(s).',
                $input->getOption('dry-run') ? 'Would import' : 'Imported',
                $added,
                $skipped,
                count($problems)
            )
        );

        return [] === $problems ? Command::SUCCESS : Command::FAILURE;
    }

    private function alreadyImported(ExchangeReport $candidate): bool
    {
        foreach ($this->reports->findBy(['destination' => $candidate->getDestination(), 'author' => null]) as $existing) {
            if (
                $existing->getAcademicYear() === $candidate->getAcademicYear()
                && $existing->getProgram() === $candidate->getProgram()
                && $existing->getLegacyAuthorName() === $candidate->getLegacyAuthorName()
                && $existing->getSections() === $candidate->getSections()
                && $existing->getCourses() === $candidate->getCourses()
            ) {
                return true;
            }
        }

        return false;
    }
}
