<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\ApiResource\ExamQuestionConfirmationInput;
use App\ApiResource\ExamQuestionStatsApi;
use App\Entity\User;
use App\Repository\ExamQuestionConfirmationRepository;
use App\Repository\ExamQuestionRepository;
use App\Service\Exam\ExamQuestionActivity;
use App\Service\RateLimit\UserRateLimiter;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\DependencyInjection\Attribute\Target;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;

/**
 * Sets or clears "Ik had deze ook" for the logged-in user, then answers with the exam's counts.
 *
 * @implements ProcessorInterface<ExamQuestionConfirmationInput, ExamQuestionStatsApi>
 */
class ExamQuestionConfirmationProcessor implements ProcessorInterface
{
    public function __construct(
        private readonly ExamQuestionStatsProvider $stats,
        private readonly ExamQuestionRepository $questions,
        private readonly ExamQuestionConfirmationRepository $confirmations,
        private readonly Security $security,
        private readonly UserRateLimiter $rateLimiter,
        #[Target('exam_confirmation')]
        private readonly RateLimiterFactoryInterface $confirmationLimiter,
        private readonly ExamQuestionActivity $activity,
    ) {}

    public function process(
        mixed $data,
        Operation $operation,
        array $uriVariables = [],
        array $context = []
    ): ExamQuestionStatsApi {
        // Validated: both are set.
        assert(null !== $data->questionUid && null !== $data->confirmed);

        $exam = $this->stats->exam($uriVariables);
        $user = $this->security->getUser();
        assert($user instanceof User);

        $this->rateLimiter->consume($this->confirmationLimiter, 'Slow down a little. Try again in a minute.');

        $question = $this->questions->findOrCreate($exam, $data->questionUid);
        $changed = $data->confirmed
            ? $this->confirmations->confirm($user, $question)
            : $this->confirmations->unconfirm($user, $question);

        if ($changed) {
            $this->activity->questionChanged((int) $exam->getId(), $question->getUid());
        }

        return $this->stats->statsFor($exam);
    }
}
