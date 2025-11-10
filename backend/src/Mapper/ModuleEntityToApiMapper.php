<?php

namespace App\Mapper;

use App\ApiResource\CourseApi;
use App\ApiResource\ModuleApi;
use App\ApiResource\ProgramApi;
use App\Entity\Course;
use App\Entity\Module;
use Symfonycasts\MicroMapper\AsMapper;
use Symfonycasts\MicroMapper\MapperInterface;
use Symfonycasts\MicroMapper\MicroMapperInterface;

#[AsMapper(from: Module::class, to: ModuleApi::class)]
class ModuleEntityToApiMapper implements MapperInterface
{
    public function __construct(
        private readonly MicroMapperInterface $microMapper,
    ) {
    }

    public function load(object $from, string $toClass, array $context): object
    {
        assert($from instanceof Module);

        $dto = new ModuleApi();
        $dto->id = $from->getId();

        return $dto;
    }

    public function populate(object $from, object $to, array $context): object
    {
        assert($from instanceof Module);
        assert($to instanceof ModuleApi);

        $to->name = $from->getName();
        $to->courses = array_map(
            function (Course $course) {
                return $this->microMapper->map(
                    $course,
                    CourseApi::class,
                    [
                    MicroMapperInterface::MAX_DEPTH => 1,
                    ]
                );
            },
            $from->getCourses()->getValues()
        );
        $to->modules = array_map(
            function (Module $module) {
                return $this->microMapper->map(
                    $module,
                    ModuleApi::class,
                    [
                    MicroMapperInterface::MAX_DEPTH => 1,
                    ]
                );
            },
            $from->getModules()->getValues()
        );

        if ($from->getProgram() !== null) {
            $to->program = $this->microMapper->map(
                $from->getProgram(),
                ProgramApi::class,
                [
                MicroMapperInterface::MAX_DEPTH => 0,
                ]
            );
        }
        return $to;
    }
}
