<?php

namespace App\Filter;

use ApiPlatform\Doctrine\Orm\Filter\AbstractFilter;
use ApiPlatform\Doctrine\Orm\Util\QueryNameGeneratorInterface;
use ApiPlatform\Metadata\IriConverterInterface;
use ApiPlatform\Metadata\Operation;
use Doctrine\ORM\QueryBuilder;
use Doctrine\Persistence\ManagerRegistry;
use Psr\Log\LoggerInterface;
use Symfony\Component\PropertyInfo\Type;
use Symfony\Component\Serializer\NameConverter\NameConverterInterface;

final class TagFilter extends AbstractFilter
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
        // Only apply to the relevant properties
        if (!$this->isPropertyEnabled($property, $resourceClass) || !$value) {
            return;
        }

        $values = (array)$value;
        if (empty($values)) {
            return;
        }

        $alias = $queryBuilder->getRootAliases()[0];

        // Handle tag IRIs
        if ($property === 'tags') {
            $counter = 0;
            foreach ($values as $tagIri) {
                try {
                    // Use IriConverter to get the resource from IRI
                    $tag = $this->iriConverter->getResourceFromIri($tagIri);

                    $paramName = $queryNameGenerator->generateParameterName('tag_iri');
                    $joinAlias = 'tag_' . $counter++;

                    // Join with AND logic
                    $queryBuilder->innerJoin("$alias.tags", $joinAlias)
                        ->andWhere("$joinAlias.id = :$paramName")
                        ->setParameter($paramName, $tag->id);
                } catch (\Exception $e) {
                    // Log invalid IRI and continue
                    $this->logger?->notice('Invalid IRI passed to tag filter', [
                        'iri' => $tagIri,
                        'exception' => $e->getMessage()
                    ]);
                    continue;
                }
            }
            return;
        }

        // Handle tag names
        if ($property === 'tags.name') {
            $counter = 0;
            foreach ($values as $tagName) {
                $paramName = $queryNameGenerator->generateParameterName('tag_name');
                $joinAlias = 'tag_name_' . $counter++;

                // Join with AND logic and use LIKE for partial matching
                $queryBuilder->innerJoin("$alias.tags", $joinAlias)
                    ->andWhere("LOWER($joinAlias.name) LIKE LOWER(:$paramName)")
                    ->setParameter($paramName, '%' . $tagName . '%');
            }
            return;
        }
    }

    public function getDescription(string $resourceClass): array
    {
        $description = [];

        if (!$this->properties) {
            return $description;
        }

        foreach ($this->properties as $property => $strategy) {
            $description[$property] = [
                'property' => $property,
                'type' => Type::BUILTIN_TYPE_ARRAY,
                'required' => false,
                'description' => $property === 'tags.name' ?
                    'Filter by tag names (AND logic for multiple values)' :
                    'Filter by tag IRIs (AND logic for multiple values)',
                'swagger' => [
                    'type' => 'array',
                    'items' => [
                        'type' => 'string'
                    ]
                ]
            ];
        }

        return $description;
    }
}
