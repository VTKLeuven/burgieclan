<?php

namespace App\Mapper;

use App\ApiResource\CourseApi;
use App\ApiResource\CourseCommentApi;
use App\ApiResource\ModuleApi;
use App\Entity\Course;
use App\Entity\CourseComment;
use App\Entity\Module;
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
        assert($from instanceof Course);

        $dto = new CourseApi();
        $dto->id = $from->getId();

        return $dto;
    }

    public function populate(object $from, object $to, array $context): object
    {
        assert($from instanceof Course);
        assert($to instanceof CourseApi);

        $to->name = $from->getName();
        $to->code = $from->getCode();
        $to->professors = $from->getProfessors();
        $to->semesters = $from->getSemesters();
        $to->credits = $from->getCredits();
        $to->oldCourses = array_map(function (Course $course) {
            return $this->microMapper->map($course, CourseApi::class, [
                MicroMapperInterface::MAX_DEPTH => 0,
            ]);
        }, $from->getOldCourses()->getValues());
        $to->newCourses = array_map(function (Course $course) {
            return $this->microMapper->map($course, CourseApi::class, [
                MicroMapperInterface::MAX_DEPTH => 0,
            ]);
        }, $from->getNewCourses()->getValues());

        $to->identicalCourses = array_map(function (Course $course) {
            return $this->microMapper->map($course, CourseApi::class, [
                MicroMapperInterface::MAX_DEPTH => 0,
            ]);
        }, $from->getIdenticalCourses()->getValues());

        $to->modules = array_map(function (Module $module) {
            return $this->microMapper->map($module, ModuleApi::class, [
                MicroMapperInterface::MAX_DEPTH => 0,
            ]);
        }, $from->getModules()->getValues());

        $to->courseComments = array_map(function (CourseComment $comment) {
            return $this->microMapper->map($comment, CourseCommentApi::class, [
                MicroMapperInterface::MAX_DEPTH => 0,
            ]);
        }, $from->getCourseComments()->getValues());
        return $to;
    }
}
