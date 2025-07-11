<?php

namespace App\State;

use ApiPlatform\Api\IriConverterInterface;
use ApiPlatform\Doctrine\Common\State\PersistProcessor;
use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\ApiResource\CourseApi;
use App\ApiResource\DocumentApi;
use App\ApiResource\DocumentCategoryApi;
use App\ApiResource\TagApi;
use App\Entity\Document;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfonycasts\MicroMapper\MicroMapperInterface;
use Vich\UploaderBundle\Storage\StorageInterface;

final class DocumentProcessor implements ProcessorInterface
{
    public function __construct(
        #[Autowire(service: PersistProcessor::class)] private readonly ProcessorInterface $persistProcessor,
        private readonly IriConverterInterface                                            $iriConverter,
        private readonly MicroMapperInterface                                             $microMapper,
        private readonly StorageInterface                                                 $storage,
    ) {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): mixed
    {
        // $data doesn't contain anything. The data is located in the $context['request'].
        $dto = new DocumentApi();
        $request = $context['request']->request;

        // Get all variables from the request (these are IRI's), convert them to an object and add them to the dto.
        // If a variable is missing, throw a BadRequestHttpException.
        $dto->name = $request->get('name') ?? throw new BadRequestHttpException('"name" is required');
        /** @var CourseApi $course */
        $course = $this->iriConverter->getResourceFromIri($request->get('course') ??
            throw new BadRequestHttpException('"course" is required'));
        $dto->course = $course;
        /** @var DocumentCategoryApi $category */
        $category = $this->iriConverter->getResourceFromIri($request->get('category') ??
            throw new BadRequestHttpException('"category" is required'));
        $dto->category = $category;

        $dto->year = $request->get('year');

        $anonymous = $request->get('anonymous') === 'true';
        $dto->anonymous = $anonymous;

        $dto->tags = [];
        // Get all tags from the request (Symfony collects multiple 'tags' parameters as an array)
        $tagsArray = $request->all('tags');
        if (!empty($tagsArray)) {
            foreach ($tagsArray as $tagIri) {
                if (empty($tagIri)) {
                    continue;
                }
                try {
                    /** @var TagApi $tag */
                    $tag = $this->iriConverter->getResourceFromIri($tagIri);
                    $dto->tags[] = $tag;
                } catch (\Exception $e) {
                    throw new BadRequestHttpException($e->getMessage() . ' - Invalid tag IRI: ' . $tagIri);
                }
            }
        }

        // Convert the documentDto to an actual Document.
        $document = $this->microMapper->map($dto, Document::class);
        assert($document instanceof Document);

        $uploadedFile = $context['request']->files->get('file');
        if (!$uploadedFile) {
            throw new BadRequestHttpException('"file" is required');
        }

        $document->setFile($uploadedFile);

        // Persist the document to the database.
        $this->persistProcessor->process($document, $operation, $uriVariables, $context);

        // Add the id of the persisted document to the dto.
        $dto->id = $document->getId();
        // Generate the url to the file.
        $dto->contentUrl = $this->storage->resolveUri($document, 'file');

        // The return value is the object that gets send as reply to the user calling the API endpoint.
        return $dto;
    }
}
