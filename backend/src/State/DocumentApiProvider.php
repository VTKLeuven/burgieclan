<?php

/*
 * This file is part of the Symfony package.
 *
 * (c) Fabien Potencier <fabien@symfony.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace App\State;

use ApiPlatform\Doctrine\Orm\State\CollectionProvider;
use ApiPlatform\Doctrine\Orm\State\ItemProvider;
use ApiPlatform\Metadata\CollectionOperationInterface;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\ApiResource\DocumentApi;
use App\Entity\Document;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfonycasts\MicroMapper\MicroMapperInterface;

class DocumentApiProvider implements ProviderInterface
{
    public function __construct(
        #[Autowire(service: ItemProvider::class)] private readonly ProviderInterface $itemProvider,
        #[Autowire(service: CollectionProvider::class)] private readonly ProviderInterface $collectionProvider,
        private readonly MicroMapperInterface $microMapper,
        private readonly Security $security,
    ) {
    }

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|array|null
    {
        if ($operation instanceof CollectionOperationInterface) {
            // Get the current user
            $currentUser = $this->security->getUser();
            $context['filters'] = $context['filters'] ?? [];

            if ($currentUser) {
                // Add custom filter parameter for our extension to use
                $context['filters']['_under_review_filter'] = [
                    'currentUserId' => $currentUser
                ];
            }

            $paginator = $this->collectionProvider->provide($operation, $uriVariables, $context);
            
            // If it's an ApiPlatform\Doctrine\Orm\Paginator
            if ($paginator instanceof \ApiPlatform\Doctrine\Orm\Paginator) {
                // Process each document while maintaining pagination
                $processedItems = [];
                foreach ($paginator as $document) {
                    $processedItems[] = $this->processDocument($document);
                }
                
                // Create a custom TraversablePaginator with our processed items
                return new \ApiPlatform\State\Pagination\TraversablePaginator(
                    new \ArrayIterator($processedItems),
                    $paginator->getCurrentPage(),
                    $paginator->getItemsPerPage(),
                    $paginator->getTotalItems()
                );
            }

            // For non-paginated results (should not happen, but just in case)
            return array_map(fn($document) => $this->processDocument($document), iterator_to_array($paginator));
        }

        if ($operation instanceof Get) {
            $document = $this->itemProvider->provide($operation, $uriVariables, $context);
            return $this->processDocument($document);
        }

        return $this->itemProvider->provide($operation, $uriVariables, $context);
    }

    // Returns DocumentApi object with author removed if document is anonymous
    private function processDocument(Document $document)
    {
        $documentApi = $this->microMapper->map($document, DocumentApi::class);

        if ($document->isAnonymous()) {
            unset($documentApi->creator); // Remove author in GET-requests if document is anonymous
        }

        return $documentApi;
    }
}
