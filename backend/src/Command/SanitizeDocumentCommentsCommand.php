<?php

namespace App\Command;

use App\EventListener\DocumentCommentSanitizer;
use Doctrine\DBAL\Connection;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Runs every stored document comment through the sanitizer that new comments get on every write
 * (DocumentCommentSanitizer), for comments stored before it existed.
 *
 * Writes straight through DBAL, so the cleaned comments keep their update date instead of
 * looking edited by their author. Changes nothing with --dry-run. Safe to run any number of times.
 *
 * Nearly every comment changes a little, because the sanitizer writes `'` as `&#039;` and `<br>`
 * as `<br />`. The comments that also lost markup (a tag, an attribute, a link) are listed by id:
 * those are the ones worth a look. -v shows every change in full.
 *
 *     php bin/console app:document-comments:sanitize --dry-run -v
 */
#[AsCommand(
    name: 'app:document-comments:sanitize',
    description: 'Strips everything the comment editor cannot produce from stored document comments',
)]
final class SanitizeDocumentCommentsCommand extends Command
{
    public function __construct(
        private readonly Connection $connection,
        private readonly DocumentCommentSanitizer $sanitizer,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addOption('dry-run', null, InputOption::VALUE_NONE, 'Only list the comments that would change');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $dryRun = (bool) $input->getOption('dry-run');

        $rows = $this->connection->iterateAssociative('SELECT id, content FROM document_comment ORDER BY id');
        $changed = 0;
        $stripped = [];
        $checked = 0;
        foreach ($rows as $row) {
            $checked++;
            $content = (string) $row['content'];
            $sanitized = $this->sanitizer->sanitize($content);
            if ($sanitized === $content) {
                continue;
            }

            $changed++;
            if (self::normalize($sanitized) !== self::normalize($content)) {
                $stripped[] = (int) $row['id'];
            }
            if ($io->isVerbose()) {
                $io->section(sprintf('Document comment %d', $row['id']));
                $io->text(['Before: ' . $content, 'After:  ' . $sanitized]);
            }
            if (!$dryRun) {
                $this->connection->update('document_comment', ['content' => $sanitized], ['id' => $row['id']]);
            }
        }

        if ([] !== $stripped) {
            $io->text(sprintf('Markup %s removed from document comment(s):', $dryRun ? 'would be' : 'was'));
            $io->listing(array_map(static fn (int $id) => (string) $id, $stripped));
        }
        $io->success(
            sprintf(
                '%s %d of %d document comment(s), %d of them losing markup%s.',
                $dryRun ? 'Would sanitize' : 'Sanitized',
                $changed,
                $checked,
                count($stripped),
                $dryRun ? ' (dry run, nothing written)' : '',
            )
        );

        return Command::SUCCESS;
    }

    /**
     * Undoes what the sanitizer changes without changing the meaning: entities and the way void
     * elements are closed. Only for telling those changes apart; never stored.
     */
    private static function normalize(string $html): string
    {
        $html = (string) preg_replace('#<(br|hr)\s*/?>#i', '<$1>', $html);

        return html_entity_decode($html, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }
}
