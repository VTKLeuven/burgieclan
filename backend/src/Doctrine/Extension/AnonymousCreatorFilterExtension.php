<?php

namespace App\Doctrine\Extension;

use ApiPlatform\Doctrine\Orm\Extension\QueryCollectionExtensionInterface;
use ApiPlatform\Doctrine\Orm\Util\QueryNameGeneratorInterface;
use ApiPlatform\Metadata\Operation;
use App\Entity\Document;
use Doctrine\ORM\QueryBuilder;

class AnonymousCreatorFilterExtension implements QueryCollectionExtensionInterface
{
    public function applyToCollection(
        QueryBuilder                $queryBuilder,
        QueryNameGeneratorInterface $queryNameGenerator,
        string                      $resourceClass,
        ?Operation                   $operation = null,
        array                       $context = []
    ): void {
        // Only apply to Document entities
        if ($resourceClass !== Document::class) {
            return;
        }

        // Check if creator.fullName filter is present
        if (!isset($context['filters']['creator.fullName'])) {
            return;
        }

        // Get the original creator name filter value
        $creatorName = $context['filters']['creator.fullName'];

        // Remove the original filter since we'll handle it manually
        unset($context['filters']['creator.fullName']);

        $rootAlias = $queryBuilder->getRootAliases()[0];

        // Join with creator table if not already joined
        $creatorAlias = $queryNameGenerator->generateJoinAlias('creator');
        $queryBuilder->leftJoin("$rootAlias.creator", $creatorAlias);

        // Create parameter name
        $creatorNameParam = $queryNameGenerator->generateParameterName('creatorName');

        // Only allow filtering non-anonymous documents
        $queryBuilder->andWhere(
            $queryBuilder->expr()->andX(
                $queryBuilder->expr()->eq("$rootAlias.anonymous", 'false'),
                $queryBuilder->expr()->like("LOWER($creatorAlias.fullName)", "LOWER(:$creatorNameParam)")
            )
        );

        $queryBuilder->setParameter($creatorNameParam, '%' . $creatorName . '%');
    }
}
