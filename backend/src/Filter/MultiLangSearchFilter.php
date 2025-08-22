<?php

namespace App\Filter;

use ApiPlatform\Doctrine\Orm\Filter\AbstractFilter;
use ApiPlatform\Doctrine\Orm\Util\QueryNameGeneratorInterface;
use ApiPlatform\Metadata\Operation;
use Doctrine\ORM\QueryBuilder;
use Doctrine\Persistence\ManagerRegistry;
use Psr\Log\LoggerInterface;
use Symfony\Component\PropertyInfo\Type;
use Symfony\Component\Serializer\NameConverter\NameConverterInterface;

/**
 * Generic filter for searching across multiple fields (e.g. for multilingual fields).
 * Configure mapping in service definition.
 */
final class MultiLangSearchFilter extends AbstractFilter
{
    private array $fieldMappings;

    public function __construct(
        ManagerRegistry         $managerRegistry,
        ?array                  $properties = null,
        ?LoggerInterface        $logger = null,
        ?NameConverterInterface $nameConverter = null
    ) {
        parent::__construct($managerRegistry, $logger, $properties, $nameConverter);
        $this->fieldMappings = $properties ?? [];
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
        if (!isset($this->fieldMappings[$property]) || !$value) {
            return;
        }

        $alias = $queryBuilder->getRootAliases()[0];
        $orX = $queryBuilder->expr()->orX();
        $paramName = $queryNameGenerator->generateParameterName($property . '_filter');

        foreach ($this->fieldMappings[$property] as $field) {
            $orX->add($queryBuilder->expr()->like("$alias.$field", ":$paramName"));
        }

        $queryBuilder
            ->andWhere($orX)
            ->setParameter($paramName, '%' . $value . '%');
    }

    public function getDescription(string $resourceClass): array
    {
        $desc = [];
        foreach ($this->fieldMappings as $property => $fields) {
            $desc[$property] = [
                'property' => $property,
                'type' => Type::BUILTIN_TYPE_STRING,
                'required' => false,
                'swagger' => [
                    'description' => sprintf('Search by %s (matches any of: %s)', $property, implode(', ', $fields)),
                ],
            ];
        }
        return $desc;
    }
}
