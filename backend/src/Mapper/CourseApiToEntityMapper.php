<?php

namespace App\Mapper;

use App\ApiResource\CourseApi;
use App\Entity\Course;
use App\Entity\CourseComment;
use App\Entity\Module;
use App\Repository\CourseRepository;
use Exception;
use Symfony\Component\PropertyAccess\PropertyAccessorInterface;
use Symfonycasts\MicroMapper\AsMapper;
use Symfonycasts\MicroMapper\MapperInterface;
use Symfonycasts\MicroMapper\MicroMapperInterface;

#[AsMapper(from: CourseApi::class, to: Course::class)]
class CourseApiToEntityMapper implements MapperInterface
{
    public function __construct(
        private readonly CourseRepository          $repository,
        private readonly MicroMapperInterface      $microMapper,
        private readonly PropertyAccessorInterface $propertyAccessor,
    ) {
    }

    /**
     * @throws Exception
     */
    public function load(object $from, string $toClass, array $context): object
    {
        assert($from instanceof CourseApi);

        $entity = $from->id ? $this->repository->find($from->id) : null;
        if (!$entity) {
            throw new Exception('Course not found');
        }

        return $entity;
    }

    public function populate(object $from, object $to, array $context): object
    {
        assert($from instanceof CourseApi);
        assert($to instanceof Course);

        $to->setName($from->name);
        $to->setCode($from->code);
        $to->setProfessors($from->professors);
        $to->setSemesters($from->semesters);
        $to->setCredits($from->credits);

        $oldCourses = [];
        foreach ($from->oldCourses as $course) {
            $oldCourses[] = $this->microMapper->map($course, Course::class, [
                MicroMapperInterface::MAX_DEPTH => 0,
            ]);
        }
        $this->propertyAccessor->setValue($to, 'oldCourses', $oldCourses);

        $newCourses = [];
        foreach ($from->newCourses as $course) {
            $newCourses[] = $this->microMapper->map($course, Course::class, [
                MicroMapperInterface::MAX_DEPTH => 0,
            ]);
        }
        $this->propertyAccessor->setValue($to, 'newCourses', $newCourses);

        $identicalCourses = [];
        foreach ($from->identicalCourses as $course) {
            $identicalCourses[] = $this->microMapper->map($course, Course::class, [
                MicroMapperInterface::MAX_DEPTH => 0,
            ]);
        }
        $this->propertyAccessor->setValue($to, 'identicalCourses', $identicalCourses);

        $modules = [];
        foreach ($from->modules as $module) {
            $modules[] = $this->microMapper->map($module, Module::class, [
                MicroMapperInterface::MAX_DEPTH => 0,
            ]);
        }
        $this->propertyAccessor->setValue($to, 'modules', $modules);

        $courseComments = [];
        foreach ($from->courseComments as $comment) {
            $courseComments[] = $this->microMapper->map($comment, CourseComment::class, [
                MicroMapperInterface::MAX_DEPTH => 0,
            ]);
        }
        $this->propertyAccessor->setValue($to, 'courseComments', $courseComments);

        return $to;
    }
}
