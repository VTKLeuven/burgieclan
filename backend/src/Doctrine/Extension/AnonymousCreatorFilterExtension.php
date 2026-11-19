<?php

namespace App\Doctrine\Extension;

use ApiPlatform\Doctrine\Orm\Extension\QueryCollectionExtensionInterface;
use ApiPlatform\Doctrine\Orm\Util\QueryNameGeneratorInterface;
use ApiPlatform\Metadata\Operation;
use App\Entity\CourseComment;
use App\Entity\Document;
use App\Entity\DocumentComment;
use Doctrine\ORM\QueryBuilder;

class AnonymousCreatorFilterExtension implements QueryCollectionExtensionInterface
{
    private const SUPPORTED_ENTITIES = [
        Document::class,
        CourseComment::class,
        DocumentComment::class,
    ];

    public function applyToCollection(
        QueryBuilder $queryBuilder,
        QueryNameGeneratorInterface $queryNameGenerator,
        string $resourceClass,
        ?Operation $operation = null,
        array $context = []
    ): void {
        if (!in_array($resourceClass, self::SUPPORTED_ENTITIES, true)) {
            return;
        }

        $filters = $context['filters'] ?? [];
        $rootAlias = $queryBuilder->getRootAliases()[0];

        $hasCreatorFilter = array_key_exists('creator', $filters);
        $creatorName = $filters['_anonymous_creator_filter']['value'] ?? $filters['creator.fullName'] ?? null;
        $hasCreatorNameFilter = null !== $creatorName;

        if (!$hasCreatorFilter && !$hasCreatorNameFilter) {
            return;
        }

        // Anonymous records must never be matchable through any creator filter.
        $queryBuilder->andWhere("$rootAlias.anonymous = false");

        if ($hasCreatorFilter) {
            $creatorIds = $this->extractUserIds($filters['creator']);
            if ([] === $creatorIds) {
                $queryBuilder->andWhere('1 = 0');
            } else {
                $creatorIdsParam = $queryNameGenerator->generateParameterName('creatorIds');
                $queryBuilder
                    ->andWhere("IDENTITY($rootAlias.creator) IN (:$creatorIdsParam)")
                    ->setParameter($creatorIdsParam, $creatorIds);
            }
        }

        if ($hasCreatorNameFilter) {
            if (!is_string($creatorName)) {
                $queryBuilder->andWhere('1 = 0');
                return;
            }

            $creatorAlias = $queryNameGenerator->generateJoinAlias('creator');
            $queryBuilder->leftJoin("$rootAlias.creator", $creatorAlias);

            $creatorNameParam = $queryNameGenerator->generateParameterName('creatorName');
            $queryBuilder
                ->andWhere("LOWER($creatorAlias.fullName) LIKE LOWER(:$creatorNameParam)")
                ->setParameter($creatorNameParam, '%' . $creatorName . '%');
        }
    }

    /**
     * @return int[]
     */
    private function extractUserIds(mixed $raw): array
    {
        $values = is_array($raw) ? $raw : [$raw];
        $ids = [];

        foreach ($values as $value) {
            if (!is_string($value) && !is_int($value)) {
                continue;
            }
            if (preg_match('/^(?:\/api\/users\/)?(\d+)$/', trim((string) $value), $matches)) {
                $ids[] = (int) $matches[1];
            }
        }

        return array_values(array_unique($ids));
    }
}
