<?php

namespace App\Mapper;

use App\ApiResource\CourseCommentApi;
use App\ApiResource\CourseCommentVoteApi;
use App\ApiResource\UserApi;
use App\Entity\CourseCommentVote;
use Symfonycasts\MicroMapper\AsMapper;
use Symfonycasts\MicroMapper\MapperInterface;
use Symfonycasts\MicroMapper\MicroMapperInterface;

#[AsMapper(from: CourseCommentVote::class, to: CourseCommentVoteApi::class)]
class CourseCommentVoteEntityToApiMapper implements MapperInterface
{
    public function __construct(
        private readonly MicroMapperInterface $microMapper,
    ) {
    }

    public function load(object $from, string $toClass, array $context): object
    {
        assert($from instanceof CourseCommentVote);

        $dto = new CourseCommentVoteApi();
        $dto->id = $from->getId();

        return $dto;
    }

    public function populate(object $from, object $to, array $context): object
    {
        assert($from instanceof CourseCommentVote);
        assert($to instanceof CourseCommentVoteApi);

        $to->isUpvote = $from->isUpvote();
        $to->comment = $this->microMapper->map($from->getComment(), CourseCommentApi::class, [
            MicroMapperInterface::MAX_DEPTH => 0,
        ]);
        $to->creator = $this->microMapper->map($from->getCreator(), UserApi::class, [
            MicroMapperInterface::MAX_DEPTH => 0,
        ]);
        $to->createdAt = $from->getCreateDate()->format('Y-m-d H:i:s');
        $to->updatedAt = $from->getUpdateDate()->format('Y-m-d H:i:s');

        return $to;
    }
}
