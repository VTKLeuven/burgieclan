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

class TagDocumentCourseFilter extends AbstractFilter
{
    private IriConverterInterface $iriConverter;

    public function __construct(
        ManagerRegistry $managerRegistry,
        IriConverterInterface $iriConverter,
        ?LoggerInterface $logger = null,
        ?array $properties = null,
        ?NameConverterInterface $nameConverter = null
    ) {
        parent::__construct($managerRegistry, $logger, $properties, $nameConverter);

        $this->iriConverter = $iriConverter;
    }

    protected function filterProperty(
        string $property,
        $value,
        QueryBuilder $queryBuilder,
        QueryNameGeneratorInterface $queryNameGenerator,
        string $resourceClass,
        ?Operation $operation = null,
        array $context = []
    ): void {
        if ($property !== 'course') {
            return;
        }

        $courseId = $value;

        // Try to convert IRI to an entity and get its ID
        if (is_string($value) && strpos($value, '/api/') === 0) {
            try {
                $courseApi = $this->iriConverter->getResourceFromIri($value);
                $courseId = $courseApi->id;
            } catch (\Exception $e) {
                // If conversion fails (e.g., course doesn't exist), add a condition that returns no results
                $queryBuilder->andWhere('1 = 0'); // This will ensure no results are returned
                return;
            }
        }

        // Ensure courseId is a valid integer
        if (!is_numeric($courseId) || (int)$courseId != $courseId) {
            // If courseId is not a valid integer, return no results
            $queryBuilder->andWhere('1 = 0');
            return;
        }

        $courseId = (int) $courseId;

        $alias = $queryBuilder->getRootAliases()[0];
        $valueParameter = $queryNameGenerator->generateParameterName('course');

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
            ->join("$docAlias.course", 'co')
            ->andWhere("co.id = :$valueParameter")
            ->setParameter($valueParameter, $courseId);
    }

    public function getDescription(string $resourceClass): array
    {
        return [
            'course' => [
                'property' => 'course',
                'type' => 'string',
                'required' => false,
                'description' => 'Filter tags by document course (IRI or ID)',
                'swagger' => [
                    'description' => 'Filter tags by document course - accepts course IRI or ID',
                    'type' => 'string',
                ],
            ],
        ];
    }
}
