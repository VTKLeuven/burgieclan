<?php

namespace App\Mapper;

use App\ApiResource\ExamApi;
use App\ApiResource\ExamQuestionCommentApi;
use App\Entity\ExamQuestionComment;
use App\Entity\User;
use App\Service\Collab\CollabDisplayName;
use Symfony\Bundle\SecurityBundle\Security;
use Symfonycasts\MicroMapper\AsMapper;
use Symfonycasts\MicroMapper\MicroMapperInterface;

#[AsMapper(from: ExamQuestionComment::class, to: ExamQuestionCommentApi::class)]
class ExamQuestionCommentEntityToApiMapper extends BaseEntityToApiMapper
{
    public function __construct(
        private readonly MicroMapperInterface $microMapper,
        private readonly Security $security,
        private readonly CollabDisplayName $displayName,
    ) {}

    public function load(object $from, string $toClass, array $context): object
    {
        assert($from instanceof ExamQuestionComment);

        $dto = new ExamQuestionCommentApi();
        $this->mapBaseFields($from, $dto);

        return $dto;
    }

    public function populate(object $from, object $to, array $context): object
    {
        assert($from instanceof ExamQuestionComment);
        assert($to instanceof ExamQuestionCommentApi);

        $exam = $from->getQuestion()->getExam();
        $creator = $from->getCreator();
        $viewer = $this->security->getUser();

        $to->exam = $this->microMapper->map($exam, ExamApi::class, [MicroMapperInterface::MAX_DEPTH => 0]);
        $to->questionUid = $from->getQuestion()->getUid();
        $to->content = $from->getContent();
        $to->anonymous = $from->isAnonymous();
        $to->creatorId = $creator->getId();
        $to->mine = $viewer instanceof User && $viewer->getId() === $creator->getId();
        // The same name as on the author's cursor in this exam, see CollabDisplayName.
        $to->authorName = $from->isAnonymous()
            ? $this->displayName->pseudonym((int) $creator->getId(), $exam->getDocumentName())
            : $creator->getFullName();

        return $to;
    }
}
