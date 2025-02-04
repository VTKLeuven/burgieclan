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
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\ApiResource\DocumentApi;
use App\Entity\Document;
use Error;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfonycasts\MicroMapper\MicroMapperInterface;
use function _PHPStan_8c645376c\React\Promise\map;

class DocumentApiProvider implements ProviderInterface
{
    public function __construct(
        #[Autowire(service: ItemProvider::class)] private readonly ProviderInterface $itemProvider,
        #[Autowire(service: CollectionProvider::class)] private readonly ProviderInterface $collectionProvider,
        private readonly MicroMapperInterface $microMapper
    ) {
    }

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|array|null
    {
        if ($operation instanceof CollectionOperationInterface) {
            $documentPaginator = $this->collectionProvider->provide($operation, $uriVariables, $context);
            $documents = iterator_to_array($documentPaginator);
            return array_map(fn($document) => $this->processDocument($document), $documents);
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
            $documentApi->creator = null;
        }

        return $documentApi;
    }
}
