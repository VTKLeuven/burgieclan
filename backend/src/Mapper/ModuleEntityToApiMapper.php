<?php

namespace App\Mapper;

use App\ApiResource\CourseApi;
use App\ApiResource\ModuleApi;
use App\ApiResource\ProgramApi;
use App\Constants\MappingContext;
use App\Entity\Course;
use App\Entity\Module;
use Symfonycasts\MicroMapper\AsMapper;
use Symfonycasts\MicroMapper\MicroMapperInterface;

#[AsMapper(from: Module::class, to: ModuleApi::class)]
class ModuleEntityToApiMapper extends BaseEntityToApiMapper
{
    public function __construct(
        private readonly MicroMapperInterface $microMapper,
    ) {}

    public function load(object $from, string $toClass, array $context): object
    {
        assert($from instanceof Module);

        $dto = new ModuleApi();
        $this->mapBaseFields($from, $dto);

        return $dto;
    }

    public function populate(object $from, object $to, array $context): object
    {
        assert($from instanceof Module);
        assert($to instanceof ModuleApi);

        $to->name = $from->getName();
        $to->isElective = $from->isElective();

        // Embedded modules only need enough information to draw the next row. Their relationships
        // stay uninitialized so Symfony omits them; expanding the row requests its real detail.
        if ($context[MappingContext::SUMMARY] ?? false) {
            return $to;
        }

        $includeCurriculumTree = $context[MappingContext::CURRICULUM_TREE] ?? false;
        $to->courses = array_map(
            function (Course $course) use ($includeCurriculumTree) {
                if (!$includeCurriculumTree) {
                    return $this->microMapper->map(
                        $course,
                        CourseApi::class,
                        [MappingContext::SUMMARY => true]
                    );
                }

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
            function (Module $module) use ($includeCurriculumTree) {
                if (!$includeCurriculumTree) {
                    return $this->microMapper->map(
                        $module,
                        ModuleApi::class,
                        [MappingContext::SUMMARY => true]
                    );
                }

                return $this->microMapper->map(
                    $module,
                    ModuleApi::class,
                    [
                        MicroMapperInterface::MAX_DEPTH => 1,
                        MappingContext::CURRICULUM_TREE => true,
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
