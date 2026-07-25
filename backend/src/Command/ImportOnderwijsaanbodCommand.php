<?php

namespace App\Command;

use App\Service\Onderwijsaanbod\OnderwijsaanbodClient;
use App\Service\Onderwijsaanbod\OnderwijsaanbodImporter;
use App\Service\Onderwijsaanbod\ProgramTreeMapper;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Imports a KU Leuven programme structure (Program -> Module -> Course) from the onderwijsaanbod
 * data services.
 *
 * Search for a programme id:
 *     $ php bin/console app:import:onderwijsaanbod --search="burgerlijk ingenieur"
 *
 * Preview an import without writing anything:
 *     $ php bin/console app:import:onderwijsaanbod --program=55036830 --dry-run
 *
 * Import it (Dutch titles, flatten the compulsory-courses folder, regroup the common core by semester):
 *     $ php bin/console app:import:onderwijsaanbod --program=55036830 --lang=nl \
 *         --flatten="Verplichte opleidingsonderdelen" --semester="Gemeenschappelijke basis"
 */
#[AsCommand(
    name: 'app:import:onderwijsaanbod',
    description: 'Import a KU Leuven programme structure (program, modules, courses) from the onderwijsaanbod API',
)]
class ImportOnderwijsaanbodCommand extends Command
{
    public function __construct(
        private readonly OnderwijsaanbodClient $client,
        private readonly ProgramTreeMapper $mapper,
        private readonly OnderwijsaanbodImporter $importer,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addOption('search', null, InputOption::VALUE_REQUIRED, 'Search programmes by title and list their ids, then exit')
            ->addOption('program', null, InputOption::VALUE_REQUIRED, 'KU Leuven programId to import')
            ->addOption('lang', null, InputOption::VALUE_REQUIRED, 'Title language: nl or en', 'nl')
            ->addOption('flatten', null, InputOption::VALUE_REQUIRED, 'Comma-separated group names/ids whose folder is skipped (courses attach to the parent)', 'Verplichte opleidingsonderdelen,Compulsory courses')
            ->addOption('semester', null, InputOption::VALUE_REQUIRED, 'Comma-separated group names/ids to regroup by degree-wide semester (Semester 1..N)')
            ->addOption('no-merge', null, InputOption::VALUE_NONE, 'Do not collapse single-child, course-less modules')
            ->addOption('no-enrich', null, InputOption::VALUE_NONE, 'Skip fetching professors and identical courses from the OPO index')
            ->addOption('dry-run', null, InputOption::VALUE_NONE, 'Compute changes but write nothing to the database');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        $search = $input->getOption('search');
        if (is_string($search) && $search !== '') {
            return $this->runSearch($io, $search);
        }

        $programId = $input->getOption('program');
        if (!is_string($programId) || $programId === '') {
            $io->error('Provide --program=<programId> (or --search=<query> to find one).');

            return Command::INVALID;
        }

        $lang = (string) $input->getOption('lang') === 'en' ? 'en' : 'nl';
        $flatten = $this->splitList((string) $input->getOption('flatten'));
        $semester = $this->splitList((string) $input->getOption('semester'));
        $merge = !$input->getOption('no-merge');
        $enrich = !$input->getOption('no-enrich');
        $dryRun = (bool) $input->getOption('dry-run');

        $io->section(sprintf('Fetching programme %s', $programId));
        $source = $this->client->fetchProgramSource($programId);
        if ($source === null) {
            $io->error(sprintf('No programme found for programId %s.', $programId));

            return Command::FAILURE;
        }

        $programData = $this->mapper->map($source, $programId, $lang, $flatten, $semester, $merge);
        if ($programData === null) {
            $io->error(sprintf('Programme document did not contain programId %s.', $programId));

            return Command::FAILURE;
        }

        $io->writeln(
            sprintf(
                '<info>%s</info> — %d top-level module(s), %d distinct course(s)',
                $programData->name,
                count($programData->modules),
                count($programData->allCourseCodes()),
            )
        );

        $result = $this->importer->import($programData, $enrich, $dryRun);

        $io->section($dryRun ? 'Dry run — no changes written' : 'Import complete');
        $io->definitionList(
            ['Program' => $result->programCreated ? 'created' : 'updated'],
            ['Modules created' => (string) $result->modulesCreated],
            ['Modules updated' => (string) $result->modulesUpdated],
            ['Courses created' => (string) $result->coursesCreated],
            ['Courses updated' => (string) $result->coursesUpdated],
            ['Course links' => (string) $result->courseLinks],
            ['Courses enriched' => (string) $result->enrichedCourses],
        );

        foreach ($result->warnings as $warning) {
            $io->warning($warning);
        }

        return Command::SUCCESS;
    }

    /**
     * @return list<string>
     */
    private function splitList(string $value): array
    {
        return array_values(array_filter(array_map('trim', explode(',', $value))));
    }

    private function runSearch(SymfonyStyle $io, string $query): int
    {
        $results = $this->client->searchPrograms($query);
        if ($results === []) {
            $io->warning('No programmes matched.');

            return Command::SUCCESS;
        }

        $io->table(
            ['programId', 'title'],
            array_map(static fn (array $r): array => [$r['programId'], $r['title']], $results),
        );

        return Command::SUCCESS;
    }
}
