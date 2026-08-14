<?php

namespace App\Mapper;

use App\ApiResource\ModuleApi;
use App\ApiResource\ProgramApi;
use App\Constants\MappingContext;
use App\Entity\Module;
use App\Entity\Program;
use Symfonycasts\MicroMapper\AsMapper;
use Symfonycasts\MicroMapper\MicroMapperInterface;

#[AsMapper(from: Program::class, to: ProgramApi::class)]
class ProgramEntityToApiMapper extends BaseEntityToApiMapper
{
    public function __construct(
        private readonly MicroMapperInterface $microMapper,
    ) {}

    public function load(object $from, string $toClass, array $context): object
    {
        assert($from instanceof Program);

        $dto = new ProgramApi();
        $this->mapBaseFields($from, $dto);

        return $dto;
    }

    public function populate(object $from, object $to, array $context): object
    {
        assert($from instanceof Program);
        assert($to instanceof ProgramApi);

        $to->name = $from->getName();
        // Defaults to 'nl' for manually created programs, which were never imported.
        $to->language = $from->getLanguage();

        // The program list drives the first paint of /courses. Do not even touch the lazy Doctrine
        // association here: this keeps both the SQL work and the response proportional to the
        // number of programs, not to the complete curriculum tree.
        if (
            ($context[MappingContext::COLLECTION_OPERATION] ?? false)
            && ($context[MappingContext::OPERATION_NAME] ?? null) !== 'program_tree'
        ) {
            return $to;
        }

        $includeCurriculumTree = ($context[MappingContext::OPERATION_NAME] ?? null) === 'program_tree';
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
                        MicroMapperInterface::MAX_DEPTH => 2,
                        MappingContext::CURRICULUM_TREE => true,
                    ]
                );
            },
            $from->getModules()->getValues()
        );
        return $to;
    }
}
