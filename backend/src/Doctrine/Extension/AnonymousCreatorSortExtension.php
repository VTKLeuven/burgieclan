<?php

namespace App\Doctrine\Extension;

use ApiPlatform\Doctrine\Orm\Extension\QueryCollectionExtensionInterface;
use ApiPlatform\Doctrine\Orm\Util\QueryNameGeneratorInterface;
use ApiPlatform\Metadata\Operation;
use App\Entity\Document;
use Doctrine\ORM\QueryBuilder;

class AnonymousCreatorSortExtension implements QueryCollectionExtensionInterface
{
    public function applyToCollection(
        QueryBuilder $queryBuilder,
        QueryNameGeneratorInterface $queryNameGenerator,
        string $resourceClass,
        Operation $operation = null,
        array $context = []
    ): void {
        // Only apply to Document entities
        if ($resourceClass !== Document::class) {
            return;
        }

        // Check if our custom sort parameter is present
        if (!isset($context['filters']['_anonymous_creator_sort'])) {
            return;
        }

        $direction = $context['filters']['_anonymous_creator_sort']['direction'];
        $rootAlias = $queryBuilder->getRootAliases()[0];
        
        // Join with creator table
        $creatorAlias = $queryNameGenerator->generateJoinAlias('creator');
        $queryBuilder->leftJoin("$rootAlias.creator", $creatorAlias);
        
        // Use CASE statement to replace creator name with 'Anonymous' for anonymous documents
        $queryBuilder->addSelect(
            "CASE WHEN $rootAlias.anonymous = true THEN 'Anonymous' ELSE $creatorAlias.fullName END AS HIDDEN creatorSortName"
        );
        
        // Sort by our computed field
        $queryBuilder->orderBy('creatorSortName', $direction);
    }
}
