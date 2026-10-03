<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\ApiResource\ExamQuestionStatsApi;
use App\Entity\Exam;
use App\Entity\User;
use App\Repository\ExamQuestionRepository;
use App\Repository\ExamRepository;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * @implements ProviderInterface<ExamQuestionStatsApi>
 */
class ExamQuestionStatsProvider implements ProviderInterface
{
    public function __construct(
        private readonly ExamRepository $exams,
        private readonly ExamQuestionRepository $questions,
        private readonly Security $security,
    ) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): ExamQuestionStatsApi
    {
        return $this->statsFor($this->exam($uriVariables));
    }

    /**
     * @param array<string, mixed> $uriVariables
     */
    public function exam(array $uriVariables): Exam
    {
        return $this->exams->find((int) ($uriVariables['id'] ?? 0))
            ?? throw new NotFoundHttpException('Exam reconstruction not found.');
    }

    public function statsFor(Exam $exam): ExamQuestionStatsApi
    {
        $user = $this->security->getUser();
        assert($user instanceof User);

        $stats = new ExamQuestionStatsApi();
        $stats->id = $exam->getId();
        $stats->questions = $this->questions->findStats($exam, $user);

        return $stats;
    }
}
