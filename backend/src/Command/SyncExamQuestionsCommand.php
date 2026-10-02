<?php

namespace App\Command;

use App\Repository\CollabDocumentRepository;
use App\Repository\ExamRepository;
use App\Service\Exam\ExamQuestionSync;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Rebuilds the exam_question rows of every exam from its stored document.
 *
 * The rows follow the document on every store by themselves (ExamQuestionSync), so this is only
 * needed for exams nobody edited since the rows were introduced, or after the way a question is
 * read from the document changed. Safe to run any number of times.
 *
 *     php bin/console app:exam-questions:sync
 */
#[AsCommand(
    name: 'app:exam-questions:sync',
    description: 'Copies the questions of every exam reconstruction from its stored document into exam_question',
)]
final class SyncExamQuestionsCommand extends Command
{
    public function __construct(
        private readonly ExamRepository $exams,
        private readonly CollabDocumentRepository $documents,
        private readonly ExamQuestionSync $questionSync,
        private readonly EntityManagerInterface $entityManager,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $synced = 0;

        foreach ($this->exams->findAll() as $exam) {
            $document = $this->documents->findOneByName($exam->getDocumentName());
            $this->questionSync->sync($exam, $document?->getContent());
            $synced++;
        }
        $this->entityManager->flush();

        $io->success(sprintf('Synced the questions of %d exam reconstruction(s).', $synced));

        return Command::SUCCESS;
    }
}
