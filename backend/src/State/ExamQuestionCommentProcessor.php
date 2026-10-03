<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\Metadata\Post;
use ApiPlatform\State\ProcessorInterface;
use App\ApiResource\ExamQuestionCommentApi;
use App\Service\Exam\ExamQuestionActivity;
use App\Service\RateLimit\UserRateLimiter;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\DependencyInjection\Attribute\Target;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;

/**
 * Saves comments on exam questions like any other resource, and around that: a new comment
 * counts against the exam_comment rate limit, and every change is announced to whoever has the
 * exam open (ExamQuestionActivity).
 *
 * @implements ProcessorInterface<ExamQuestionCommentApi, ExamQuestionCommentApi|null>
 */
class ExamQuestionCommentProcessor implements ProcessorInterface
{
    public function __construct(
        #[Autowire(service: EntityClassDtoStateProcessor::class)]
        private readonly ProcessorInterface $inner,
        private readonly UserRateLimiter $rateLimiter,
        #[Target('exam_comment')]
        private readonly RateLimiterFactoryInterface $commentLimiter,
        private readonly ExamQuestionActivity $activity,
    ) {}

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): mixed
    {
        if ($operation instanceof Post) {
            $this->rateLimiter->consume(
                $this->commentLimiter,
                'You have posted a lot of comments in a short time. Try again later.'
            );
        }

        $result = $this->inner->process($data, $operation, $uriVariables, $context);

        if (null !== $data->exam?->id && null !== $data->questionUid) {
            $this->activity->questionChanged($data->exam->id, $data->questionUid);
        }

        return $result;
    }
}
