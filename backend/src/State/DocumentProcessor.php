<?php

namespace App\State;

use ApiPlatform\Api\IriConverterInterface;
use ApiPlatform\Doctrine\Common\State\PersistProcessor;
use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\ApiResource\CourseApi;
use App\ApiResource\DocumentApi;
use App\ApiResource\DocumentCategoryApi;
use App\Entity\Document;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfonycasts\MicroMapper\MicroMapperInterface;
use Vich\UploaderBundle\Storage\StorageInterface;

final class DocumentProcessor implements ProcessorInterface
{
    public function __construct(
        #[Autowire(service: PersistProcessor::class)] private readonly ProcessorInterface $persistProcessor,
        private readonly IriConverterInterface $iriConverter,
        private readonly MicroMapperInterface $microMapper,
        private readonly StorageInterface $storage,
    ) {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = [])
    {
        $dto = new DocumentApi();
        $request = $context['request']->request;

        $dto->name = $request->get('name') ?? throw new BadRequestHttpException('"name" is required');
        /** @var CourseApi $course */
        $course = $this->iriConverter->getResourceFromIri($request->get('course') ??
            throw new BadRequestHttpException('"course" is required'));
        $dto->course = $course;
        /** @var DocumentCategoryApi $category */
        $category = $this->iriConverter->getResourceFromIri($request->get('category') ??
            throw new BadRequestHttpException('"category" is required'));
        $dto->category = $category;
        $dto->under_review = $request->get('under_review') ??
            throw new BadRequestHttpException('"under_review" is required');

        $document = $this->microMapper->map($dto, Document::class);
        assert($document instanceof Document);

        $uploadedFile = $context['request']->files->get('file');
        if (!$uploadedFile) {
            throw new BadRequestHttpException('"file" is required');
        }

        $document->setFile($uploadedFile);

        $this->persistProcessor->process($document, $operation, $uriVariables, $context);

        $dto->id = $document->getId();
        $dto->contentUrl = $this->storage->resolveUri($document, 'file');
        ;
        return $dto;
    }
}
