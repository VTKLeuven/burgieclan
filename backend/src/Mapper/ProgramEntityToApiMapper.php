<?php

namespace App\Mapper;

use App\ApiResource\ModuleApi;
use App\ApiResource\ProgramApi;
use App\Entity\Module;
use App\Entity\Program;
use Symfonycasts\MicroMapper\AsMapper;
use Symfonycasts\MicroMapper\MapperInterface;
use Symfonycasts\MicroMapper\MicroMapperInterface;

#[AsMapper(from: Program::class, to: ProgramApi::class)]
class ProgramEntityToApiMapper implements MapperInterface
{
    public function __construct(
        private readonly MicroMapperInterface $microMapper,
    ) {
    }

    public function load(object $from, string $toClass, array $context): object
    {
        assert($from instanceof Program);

        $dto = new ProgramApi();
        $dto->id = $from->getId();

        return $dto;
    }

    public function populate(object $from, object $to, array $context): object
    {
        assert($from instanceof Program);
        assert($to instanceof ProgramApi);

        $to->name = $from->getName();

        $to->modules = array_map(
            function (Module $module) {
                return $this->microMapper->map(
                    $module,
                    ModuleApi::class,
                    [
                    MicroMapperInterface::MAX_DEPTH => 2,
                    ]
                );
            },
            $from->getModules()->getValues()
        );
        return $to;
    }
}
