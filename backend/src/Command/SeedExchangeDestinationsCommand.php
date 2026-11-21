<?php

namespace App\Command;

use App\Service\Exchange\ExchangeDestinationCatalog;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Adds the faculty's exchange destinations (ExchangeDestinationCatalog) that are not there yet.
 * Existing destinations, and what moderators changed about them, are left alone, so it is safe
 * to run again after the catalogue grows.
 *
 *     php bin/console app:exchange:seed-destinations
 */
#[AsCommand(
    name: 'app:exchange:seed-destinations',
    description: 'Adds the faculty\'s exchange destinations that are missing',
)]
final class SeedExchangeDestinationsCommand extends Command
{
    public function __construct(
        private readonly ExchangeDestinationCatalog $catalog,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $added = $this->catalog->seed();

        (new SymfonyStyle($input, $output))->success(sprintf('Added %d exchange destination(s).', $added));

        return Command::SUCCESS;
    }
}
