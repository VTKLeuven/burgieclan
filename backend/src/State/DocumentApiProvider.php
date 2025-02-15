<?php

namespace App\State;

use ApiPlatform\Doctrine\Orm\State\CollectionProvider;
use ApiPlatform\Doctrine\Orm\State\ItemProvider;
use ApiPlatform\Metadata\CollectionOperationInterface;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\ApiResource\DocumentApi;
use App\Entity\Document;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\Mime\MimeTypes;
use Symfonycasts\MicroMapper\MicroMapperInterface;
use Vich\UploaderBundle\Storage\StorageInterface;

class DocumentApiProvider implements ProviderInterface
{
    private MimeTypes $mimeTypes;

    public function __construct(
        #[Autowire(service: ItemProvider::class)] private readonly ProviderInterface $itemProvider,
        #[Autowire(service: CollectionProvider::class)] private readonly ProviderInterface $collectionProvider,
        private readonly MicroMapperInterface $microMapper,
        private readonly StorageInterface $storage
    ) {
        $this->mimeTypes = new MimeTypes();
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

    private function processDocument(Document $document)
    {
        $documentApi = $this->microMapper->map($document, DocumentApi::class);

        if ($document->isAnonymous()) {
            $documentApi->creator = null;
        }

        if ($document->getFileName()) {
            $documentApi->filename = $document->getFileName();

            try {
                $filePath = $this->storage->resolvePath($document, 'file');
                if ($filePath) {
                    $mimeType = $this->mimeTypes->guessMimeType($filePath);
                    $documentApi->mimetype = $mimeType ?: 'application/octet-stream';
                }
            } catch (\Exception $e) {
                // If we can't determine the mime type, default to octet-stream
                $documentApi->mimetype = 'application/octet-stream';
            }
        }

        return $documentApi;
    }
}
