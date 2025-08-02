<?php

namespace App\Mapper;

use App\ApiResource\CourseApi;
use App\ApiResource\ProfessorApi;
use App\Entity\Course;
use App\Entity\Professor;
use Symfonycasts\MicroMapper\AsMapper;
use Symfonycasts\MicroMapper\MapperInterface;
use Symfonycasts\MicroMapper\MicroMapperInterface;

#[AsMapper(from: Professor::class, to: ProfessorApi::class)]
class ProfessorEntityToApiMapper implements MapperInterface
{
    public function __construct(
        private readonly MicroMapperInterface $microMapper,
    ) {
    }

    public function load(object $from, string $toClass, array $context): object
    {
        assert($from instanceof Professor);

        $dto = new ProfessorApi();
        $dto->id = $from->getId();

        return $dto;
    }

    public function populate(object $from, object $to, array $context): object
    {
        assert($from instanceof Professor);
        assert($to instanceof ProfessorApi);

        $to->uNumber = $from->getUNumber();
        $to->name = $from->getName();
        $to->email = $from->getEmail();
        $to->pictureUrl = $from->getPictureUrl();
        $to->department = $from->getDepartment();
        $to->title = $from->getTitle();
        $to->lastUpdated = $from->getLastUpdated();

        $to->courses = array_map(function (Course $course) {
            return $this->microMapper->map($course, CourseApi::class, [
                MicroMapperInterface::MAX_DEPTH => 0,
            ]);
        }, $from->getCourses()->getValues());

        return $to;
    }
}