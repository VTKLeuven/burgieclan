<?php

namespace App\State;

use ApiPlatform\Doctrine\Common\State\PersistProcessor;
use ApiPlatform\Doctrine\Common\State\RemoveProcessor;
use ApiPlatform\Doctrine\Orm\State\Options;
use ApiPlatform\Metadata\DeleteOperationInterface;
use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfonycasts\MicroMapper\MicroMapperInterface;

class EntityClassDtoStateProcessor implements ProcessorInterface
{
    public function __construct(
        #[Autowire(service: PersistProcessor::class)] private readonly ProcessorInterface $persistProcessor,
        #[Autowire(service: RemoveProcessor::class)] private readonly ProcessorInterface $removeProcessor,
        private readonly MicroMapperInterface $microMapper
    ) {
    }

    /**
     * @param mixed $data
     * @param Operation $operation
     * @param array $uriVariables
     * @param array $context
     * @return mixed|void|null
     */
    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = [])
    {
        $stateOptions = $operation->getStateOptions();
        assert($stateOptions instanceof Options);
        $entityClass = $stateOptions->getEntityClass();

        $entity = $this->mapDtoToEntity($data, $entityClass);

        if ($operation instanceof DeleteOperationInterface) {
            $this->removeProcessor->process($entity, $operation, $uriVariables, $context);

            return null;
        }

        $this->persistProcessor->process($entity, $operation, $uriVariables, $context);
        
        // Re-map the complete entity back to DTO to include all populated fields
        return $this->microMapper->map($entity, get_class($data));
    }

    private function mapDtoToEntity(object $dto, string $entityClass): object
    {
        return $this->microMapper->map($dto, $entityClass);
    }
}
