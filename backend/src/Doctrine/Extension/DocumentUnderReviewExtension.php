<?php

namespace App\Doctrine\Extension;

use ApiPlatform\Doctrine\Orm\Extension\QueryCollectionExtensionInterface;
use ApiPlatform\Doctrine\Orm\Util\QueryNameGeneratorInterface;
use ApiPlatform\Metadata\Operation;
use App\Entity\Document;
use Doctrine\ORM\QueryBuilder;

class DocumentUnderReviewExtension implements QueryCollectionExtensionInterface
{
    public function applyToCollection(
        QueryBuilder $queryBuilder,
        QueryNameGeneratorInterface $queryNameGenerator,
        string $resourceClass,
        ?Operation $operation = null,
        array $context = []
    ): void {
        // Only apply to Document entities
        if ($resourceClass !== Document::class) {
            return;
        }

        $rootAlias = $queryBuilder->getRootAliases()[0];

        if (isset($context['filters']['_under_review_filter'])) {
            // For authenticated users: show documents that are either
            // not under review OR created by the current user
            $paramName = $queryNameGenerator->generateParameterName('currentUserId');
            $queryBuilder
                ->andWhere(sprintf(
                    '(%s.under_review = false OR %s.creator = :%s)',
                    $rootAlias,
                    $rootAlias,
                    $paramName
                ))
                ->setParameter($paramName, $context['filters']['_under_review_filter']['currentUserId']);
        }
    }
}
