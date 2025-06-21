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
        #[Autowire(service: ItemProvider::class)] private readonly ProviderInterface       $itemProvider,
        #[Autowire(service: CollectionProvider::class)] private readonly ProviderInterface $collectionProvider,
        private readonly MicroMapperInterface                                              $microMapper,
        private readonly Security                                                          $security,
    ) {
    }

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|array|null
    {
        if ($operation instanceof CollectionOperationInterface) {
            // Get the current user
            $currentUser = $this->security->getUser();
            $context['filters'] = $context['filters'] ?? [];

            // Add custom filter parameter to use App\Doctrine\Orm\Extension\DocumentUnderReviewExtension
            if ($currentUser) {
                $context['filters']['_under_review_filter'] = [
                    'currentUserId' => $currentUser
                ];
            }

            // Add custom filter parameter to use App\Doctrine\Orm\Extension\AnonymousCreatorFilterExtension
            if (isset($context['filters']['creator.fullName'])) {
                $context['filters']['_anonymous_creator_filter'] = [
                    'value' => $context['filters']['creator.fullName']
                ];
            }

            // Add a custom sort parameter to use App\Doctrine\Orm\Extension\AnonymousCreatorSortExtension
            if (isset($context['filters']['order']['creator.fullName'])) {
                // We need to handle this sorting specially to protect anonymous documents
                // Remove the original sort parameter
                $direction = $context['filters']['order']['creator.fullName'];
                unset($context['filters']['order']['creator.fullName']);

                $context['filters']['_anonymous_creator_sort'] = [
                    'direction' => $direction
                ];
            }


            // Rename createdAt and updatedAt to createDate and updateDate
            // DocumentApi has the fields createdAt and updatedAt,
            // but Document has them as createDate and updateDate (from Node).
            // The sorting happens in the database, so we need to rename them here.
            if (isset($context['filters']['order'])) { // Sorting
                if (isset($context['filters']['order']['createdAt'])) {
                    $context['filters']['order']['createDate'] = $context['filters']['order']['createdAt'];
                    unset($context['filters']['order']['createdAt']);
                }
                if (isset($context['filters']['order']['updatedAt'])) {
                    $context['filters']['order']['updateDate'] = $context['filters']['order']['updatedAt'];
                    unset($context['filters']['order']['updatedAt']);
                }
            }
            if (isset($context['filters']['createdAt'])) { // Filtering
                // Rename createdAt to createDate
                $context['filters']['createDate'] = $context['filters']['createdAt'];
                unset($context['filters']['createdAt']);
            }
            if (isset($context['filters']['updatedAt'])) {
                // Rename updatedAt to updateDate
                $context['filters']['updateDate'] = $context['filters']['updatedAt'];
                unset($context['filters']['updatedAt']);
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
