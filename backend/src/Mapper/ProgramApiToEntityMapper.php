<?php

namespace App\Mapper;

use App\ApiResource\ProgramApi;
use App\Entity\Program;
use App\Repository\ProgramRepository;
use Exception;
use Symfonycasts\MicroMapper\AsMapper;
use Symfonycasts\MicroMapper\MapperInterface;

#[AsMapper(from: ProgramApi::class, to: Program::class)]
class ProgramApiToEntityMapper implements MapperInterface
{
    public function __construct(
        private readonly ProgramRepository $repository,
    ) {
    }

    /**
     * @throws Exception
     */
    public function load(object $from, string $toClass, array $context): object
    {
        assert($from instanceof ProgramApi);

        $entity = $from->id ? $this->repository->find($from->id) : null;
        if (!$entity) {
            throw new Exception('Program not found');
        }

        return $entity;
    }

    public function populate(object $from, object $to, array $context): object
    {
        assert($from instanceof ProgramApi);
        assert($to instanceof Program);

        // No need to set any fields from program.
        // It either gets pulled from the database in load() or doesn't exist.
        
        return $to;
    }
}
