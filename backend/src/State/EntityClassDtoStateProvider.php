<?php

namespace App\State;

use ApiPlatform\Doctrine\Orm\State\ItemProvider;
use ApiPlatform\Metadata\CollectionOperationInterface;
use ApiPlatform\Doctrine\Orm\Paginator;
use ApiPlatform\Doctrine\Orm\State\CollectionProvider;
use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\Pagination\TraversablePaginator;
use ApiPlatform\State\ProviderInterface;
use ArrayIterator;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfonycasts\MicroMapper\MicroMapperInterface;

class EntityClassDtoStateProvider implements ProviderInterface
{
    public function __construct(
        #[Autowire(service: CollectionProvider::class)] private readonly ProviderInterface $collectionProvider,
        #[Autowire(service: ItemProvider::class)] private readonly ProviderInterface $itemProvider,
        private readonly MicroMapperInterface $microMapper,
        private readonly RequestStack $requestStack,
    ) {
    }

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|array|null
    {
        $resourceClass = $operation->getClass();
        if ($operation instanceof CollectionOperationInterface) {
            $request = $this->requestStack->getCurrentRequest();
            $disablePagination = $request && $request->query->has('pagination') &&
                                ($request->query->get('pagination') === 'false'
                                || $request->query->get('pagination') === '0');

            $entities = $this->collectionProvider->provide($operation, $uriVariables, $context);
            assert($entities instanceof Paginator);

            $dtos = [];
            foreach ($entities as $entity) {
                $dtos[] = $this->mapEntityToDto($entity, $resourceClass);
            }

            // If pagination is disabled, return the raw array of DTOs
            if ($disablePagination) {
                return $dtos;
            }

            // Otherwise return a paginated result
            return new TraversablePaginator(
                new ArrayIterator($dtos),
                $entities->getCurrentPage(),
                $entities->getItemsPerPage(),
                $entities->getTotalItems()
            );
        }

        $entity = $this->itemProvider->provide($operation, $uriVariables, $context);

        if (!$entity) {
            return null;
        }

        return $this->mapEntityToDto($entity, $resourceClass);
    }

    private function mapEntityToDto(object $entity, string $resourceClass): object
    {
        $request = $this->requestStack->getCurrentRequest();
        $lang = $request->query->get('lang'); // If the language is given as param, pass it to the mapper
        return $this->microMapper->map($entity, $resourceClass, ["lang" => $lang]);
    }
}
