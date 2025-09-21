<?php

namespace App\Mapper;

use App\ApiResource\CourseCommentVoteApi;
use App\Entity\CourseComment;
use App\Entity\CourseCommentVote;
use App\Repository\CourseCommentVoteRepository;
use Exception;
use Symfony\Bundle\SecurityBundle\Security;
use Symfonycasts\MicroMapper\AsMapper;
use Symfonycasts\MicroMapper\MapperInterface;
use Symfonycasts\MicroMapper\MicroMapperInterface;

#[AsMapper(from: CourseCommentVoteApi::class, to: CourseCommentVote::class)]
class CourseCommentVoteApiToEntityMapper implements MapperInterface
{
    public function __construct(
        private readonly CourseCommentVoteRepository  $repository,
        private readonly Security                       $security,
        private readonly MicroMapperInterface           $microMapper,
    ) {
    }

    /**
     * @throws Exception
     */
    public function load(object $from, string $toClass, array $context): object
    {
        assert($from instanceof CourseCommentVoteApi);

        $entity = $from->id ? $this->repository->find($from->id) : new CourseCommentVote($this->security->getUser());
        if (!$entity) {
            throw new Exception('Course comment vote not found');
        }

        return $entity;
    }

    public function populate(object $from, object $to, array $context): object
    {
        assert($from instanceof CourseCommentVoteApi);
        assert($to instanceof CourseCommentVote);

        $to->setVoteType($from->voteType);
        $to->setCourseComment($this->microMapper->map($from->courseComment, CourseComment::class, [
            MicroMapperInterface::MAX_DEPTH => 0,
        ]));

        return $to;
    }
}
