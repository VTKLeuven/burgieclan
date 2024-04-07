<?php

namespace App\Mapper;

use App\ApiResource\CourseApi;
use App\Entity\Course;
use Symfony\Bundle\SecurityBundle\Security;
use Symfonycasts\MicroMapper\AsMapper;
use Symfonycasts\MicroMapper\MapperInterface;
use Symfonycasts\MicroMapper\MicroMapperInterface;

#[AsMapper(from: Course::class, to: CourseApi::class)]
class CourseEntityToApiMapper implements MapperInterface
{
    public function __construct(
        private readonly MicroMapperInterface $microMapper,
    ) {
    }

    public function load(object $from, string $toClass, array $context): object
    {
        $entity = $from;
        assert($entity instanceof Course);

        $dto = new CourseApi();
        $dto->id = $entity->getId();

        return $dto;
    }

    public function populate(object $from, object $to, array $context): object
    {
        $entity = $from;
        $dto = $to;
        assert($entity instanceof Course);
        assert($dto instanceof CourseApi);

        $dto->name = $entity->getName();
        $dto->code = $entity->getCode();
        $dto->professors = $entity->getProfessors();
        $dto->semesters = $entity->getSemesters();
        $dto->credits = $entity->getCredits();
        $dto->oldCourses = array_map(function (Course $course) {
            return $this->microMapper->map($course, CourseApi::class, [
                MicroMapperInterface::MAX_DEPTH => 0,
            ]);
        }, $entity->getOldCourses()->getValues());
        $dto->newCourses = array_map(function (Course $course) {
            return $this->microMapper->map($course, CourseApi::class, [
                MicroMapperInterface::MAX_DEPTH => 0,
            ]);
        }, $entity->getNewCourses()->getValues());

        /*
         * TODO: Add this code when corresponding dto's are available
        $dto->modules = array_map(function(Module $module) {
            return $this->microMapper->map($module, ModuleApi::class, [
                MicroMapperInterface::MAX_DEPTH => 0,
            ]);
        }, $entity->getModules()->getValues());
        $dto->courseComments = array_map(function(CourseComment $comment) {
            return $this->microMapper->map($comment, CourseCommentApi::class, [
                MicroMapperInterface::MAX_DEPTH => 0,
            ]);
        }, $entity->getCourseComments()->getValues());
       */
        return $dto;
    }
}
