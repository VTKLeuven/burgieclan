<?php

namespace App\Mapper;

use App\ApiResource\CourseCommentApi;
use App\ApiResource\CourseCommentVoteApi;
use App\ApiResource\UserApi;
use App\Entity\CourseCommentVote;
use Symfonycasts\MicroMapper\AsMapper;
use Symfonycasts\MicroMapper\MicroMapperInterface;

#[AsMapper(from: CourseCommentVote::class, to: CourseCommentVoteApi::class)]
class CourseCommentVoteEntityToApiMapper extends BaseEntityToApiMapper
{
    public function __construct(
        private readonly MicroMapperInterface $microMapper,
    ) {
    }

    public function load(object $from, string $toClass, array $context): object
    {
        assert($from instanceof CourseCommentVote);

        $dto = new CourseCommentVoteApi();
        $this->mapBaseFields($from, $dto);

        return $dto;
    }

    public function populate(object $from, object $to, array $context): object
    {
        assert($from instanceof CourseCommentVote);
        assert($to instanceof CourseCommentVoteApi);

        $to->voteType = $from->getVoteType();
        $to->courseComment = $this->microMapper->map(
            $from->getCourseComment(),
            CourseCommentApi::class,
            [
                MicroMapperInterface::MAX_DEPTH => 0,
            ]
        );
        $to->creator = $this->microMapper->map(
            $from->getCreator(),
            UserApi::class,
            [
                MicroMapperInterface::MAX_DEPTH => 0,
            ]
        );
        return $to;
    }
}
