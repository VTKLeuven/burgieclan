<?php

namespace App\Filter;

use ApiPlatform\Doctrine\Orm\Filter\AbstractFilter;
use ApiPlatform\Doctrine\Orm\Util\QueryNameGeneratorInterface;
use ApiPlatform\Metadata\IriConverterInterface;
use ApiPlatform\Metadata\Operation;
use Doctrine\ORM\QueryBuilder;
use Doctrine\Persistence\ManagerRegistry;
use Psr\Log\LoggerInterface;
use Symfony\Component\Serializer\NameConverter\NameConverterInterface;

class TagDocumentCategoryFilter extends AbstractFilter
{
    private IriConverterInterface $iriConverter;

    public function __construct(
        ManagerRegistry         $managerRegistry,
        IriConverterInterface   $iriConverter,
        ?LoggerInterface        $logger = null,
        ?array                  $properties = null,
        ?NameConverterInterface $nameConverter = null
    ) {
        parent::__construct($managerRegistry, $logger, $properties, $nameConverter);

        $this->iriConverter = $iriConverter;
    }

    protected function filterProperty(
        string                      $property,
        $value,
        QueryBuilder                $queryBuilder,
        QueryNameGeneratorInterface $queryNameGenerator,
        string                      $resourceClass,
        ?Operation                  $operation = null,
        array                       $context = []
    ): void {
        if ($property !== 'category') {
            return;
        }

        $categoryId = $value;

        // Try to convert IRI to an entity and get its ID
        if (is_string($value) && strpos($value, '/api/') === 0) {
            try {
                $categoryApi = $this->iriConverter->getResourceFromIri($value);
                $categoryId = $categoryApi->id;
            } catch (\Exception $e) {
                // If conversion fails, keep the original value
                // This might happen if the IRI is invalid
            }
        }

        $alias = $queryBuilder->getRootAliases()[0];
        $valueParameter = $queryNameGenerator->generateParameterName('category');

        // Check if documents join already exists from another filter
        $docAlias = 'd_shared';
        $joinFound = false;

        $joinParts = $queryBuilder->getDQLPart('join');
        if (isset($joinParts[$alias])) {
            foreach ($joinParts[$alias] as $join) {
                if ($join->getJoin() === "$alias.documents") {
                    $docAlias = $join->getAlias();
                    $joinFound = true;
                    break;
                }
            }
        }

        if (!$joinFound) {
            $queryBuilder->join("$alias.documents", $docAlias);
        }

        $queryBuilder
            ->join("$docAlias.category", 'c')
            ->andWhere("c.id = :$valueParameter")
            ->setParameter($valueParameter, $categoryId);
    }

    public function getDescription(string $resourceClass): array
    {
        return [
            'category' => [
                'property' => 'category',
                'type' => 'string',
                'required' => false,
                'description' => 'Filter tags by document category (IRI or ID)',
                'swagger' => [
                    'description' => 'Filter tags by document category - accepts category IRI or ID',
                    'type' => 'string',
                ],
            ],
        ];
    }
}
