<?php

namespace App\Mapper;

use App\ApiResource\CourseCommentApi;
use App\Entity\CommentCategory;
use App\Entity\Course;
use App\Entity\CourseComment;
use App\Entity\User;
use App\Repository\CourseCommentRepository;
use Exception;
use Symfony\Bundle\SecurityBundle\Security;
use Symfonycasts\MicroMapper\AsMapper;
use Symfonycasts\MicroMapper\MapperInterface;
use Symfonycasts\MicroMapper\MicroMapperInterface;

#[AsMapper(from: CourseCommentApi::class, to: CourseComment::class)]
class CourseCommentApiToEntityMapper implements MapperInterface
{
    public function __construct(
        private readonly CourseCommentRepository $repository,
        private readonly Security                $security,
        private readonly MicroMapperInterface $microMapper,
    ) {
    }

    /**
     * @throws Exception
     */
    public function load(object $from, string $toClass, array $context): object
    {
        assert($from instanceof CourseCommentApi);

        $user = $this->security->getUser();
        assert($user instanceof User);

        $entity = $from->id ? $this->repository->find($from->id) : new CourseComment($user);
        if (!$entity) {
            throw new Exception('Course comment not found');
        }

        return $entity;
    }

    public function populate(object $from, object $to, array $context): object
    {
        assert($from instanceof CourseCommentApi);
        assert($to instanceof CourseComment);

        $to->setContent($from->content);
        $to->setAnonymous($from->anonymous);
        $to->setCourse($this->microMapper->map($from->course, Course::class, [
            MicroMapperInterface::MAX_DEPTH => 0,
        ]));
        $to->setCategory($this->microMapper->map($from->category, CommentCategory::class, [
            MicroMapperInterface::MAX_DEPTH => 0,
        ]));

        return $to;
    }
}
