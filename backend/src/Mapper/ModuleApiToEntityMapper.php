<?php

namespace App\Mapper;

use App\ApiResource\ModuleApi;
use App\Entity\Module;
use App\Repository\ModuleRepository;
use Exception;
use Symfonycasts\MicroMapper\AsMapper;
use Symfonycasts\MicroMapper\MapperInterface;

#[AsMapper(from: ModuleApi::class, to: Module::class)]
class ModuleApiToEntityMapper implements MapperInterface
{
    public function __construct(
        private readonly ModuleRepository $repository,
    ) {
    }

    /**
     * @throws Exception
     */
    public function load(object $from, string $toClass, array $context): object
    {
        assert($from instanceof ModuleApi);

        $entity = $from->id ? $this->repository->find($from->id) : null;
        if (!$entity) {
            throw new Exception('Module not found');
        }

        return $entity;
    }

    public function populate(object $from, object $to, array $context): object
    {
        assert($from instanceof ModuleApi);
        assert($to instanceof Module);

        // No need to set any fields from module.
        // It either gets pulled from the database in load() or doesn't exist.
        
        return $to;
    }
}
