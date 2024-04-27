<?php

namespace App\Mapper;

use App\ApiResource\CommentCategoryApi;
use App\ApiResource\CourseApi;
use App\ApiResource\CourseCommentApi;
use App\Entity\CourseComment;
use Symfonycasts\MicroMapper\AsMapper;
use Symfonycasts\MicroMapper\MapperInterface;
use Symfonycasts\MicroMapper\MicroMapperInterface;

#[AsMapper(from: CourseComment::class, to: CourseCommentApi::class)]
class CourseCommentEntityToApiMapper implements MapperInterface
{
    public function __construct(
        private readonly MicroMapperInterface $microMapper,
    ) {
    }

    public function load(object $from, string $toClass, array $context): object
    {
        assert($from instanceof CourseComment);

        $dto = new CourseCommentApi();
        $dto->id = $from->getId();

        return $dto;
    }

    public function populate(object $from, object $to, array $context): object
    {
        assert($from instanceof CourseComment);
        assert($to instanceof CourseCommentApi);

        $to->content = $from->getContent();
        $to->anonymous = $from->isAnonymous();
        $to->course = $this->microMapper->map($from->getCourse(), CourseApi::class, [
            MicroMapperInterface::MAX_DEPTH => 0,
        ]);
        $to->category = $this->microMapper->map($from->getCategory(), CommentCategoryApi::class, [
            MicroMapperInterface::MAX_DEPTH => 0,
        ]);
//        $to->creator = $this->microMapper->map($from->getUser(), UserApi::class, [
//            MicroMapperInterface::MAX_DEPTH => 0,
//        ]);
        $to->createdAt = $from->getCreateDate()->format('Y-m-d H:i:s');
        $to->updatedAt = $from->getUpdateDate()->format('Y-m-d H:i:s');

        return $to;
    }
}
