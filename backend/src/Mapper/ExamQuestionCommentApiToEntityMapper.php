<?php

namespace App\Mapper;

use App\ApiResource\ExamQuestionCommentApi;
use App\Entity\Exam;
use App\Entity\ExamQuestionComment;
use App\Entity\User;
use App\Repository\ExamQuestionCommentRepository;
use App\Repository\ExamQuestionRepository;
use LogicException;
use Symfony\Bundle\SecurityBundle\Security;
use Symfonycasts\MicroMapper\AsMapper;
use Symfonycasts\MicroMapper\MapperInterface;
use Symfonycasts\MicroMapper\MicroMapperInterface;

/**
 * Only the content is ever written by a client. A new comment finds its question by exam and
 * uid, creating the row when the collab server has not stored the question yet, and is anonymous
 * when its author's account is anonymous by default.
 */
#[AsMapper(from: ExamQuestionCommentApi::class, to: ExamQuestionComment::class)]
class ExamQuestionCommentApiToEntityMapper implements MapperInterface
{
    public function __construct(
        private readonly ExamQuestionCommentRepository $comments,
        private readonly ExamQuestionRepository $questions,
        private readonly Security $security,
        private readonly MicroMapperInterface $microMapper,
    ) {}

    public function load(object $from, string $toClass, array $context): object
    {
        assert($from instanceof ExamQuestionCommentApi);

        if (null !== $from->id) {
            return $this->comments->find($from->id)
                ?? throw new LogicException(sprintf('Exam question comment %d not found.', $from->id));
        }

        $user = $this->security->getUser();
        assert($user instanceof User);

        if (null === $from->exam || null === $from->questionUid) {
            throw new LogicException('A new comment needs an exam and a question.');
        }

        $exam = $this->microMapper->map($from->exam, Exam::class, [MicroMapperInterface::MAX_DEPTH => 0]);

        $comment = new ExamQuestionComment($user, $this->questions->findOrCreate($exam, $from->questionUid));
        $comment->setAnonymous($user->isDefaultAnonymous());

        return $comment;
    }

    public function populate(object $from, object $to, array $context): object
    {
        assert($from instanceof ExamQuestionCommentApi);
        assert($to instanceof ExamQuestionComment);

        $to->setContent(trim((string) $from->content));

        return $to;
    }
}
