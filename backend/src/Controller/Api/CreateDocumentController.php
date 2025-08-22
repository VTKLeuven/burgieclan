<?php

namespace App\Controller\Api;

use ApiPlatform\Metadata\IriConverterInterface;
use App\ApiResource\CourseApi;
use App\ApiResource\DocumentApi;
use App\ApiResource\DocumentCategoryApi;
use App\ApiResource\TagApi;
use App\Entity\Document;
use Doctrine\ORM\EntityManagerInterface;
use Exception;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfonycasts\MicroMapper\MicroMapperInterface;
use Vich\UploaderBundle\Storage\StorageInterface;

class CreateDocumentController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly IriConverterInterface  $iriConverter,
        private readonly MicroMapperInterface   $microMapper,
        private readonly StorageInterface       $storage,
    ) {
    }

    public function __invoke(Request $request): DocumentApi
    {
        $dto = new DocumentApi();

        // Get all variables from the request (these are IRI's), convert them to an object and add them to the dto.
        // If a variable is missing, throw a BadRequestHttpException.
        $dto->name = $request->request->get('name') ?? throw new BadRequestHttpException('"name" is required');
        /** @var CourseApi $course */
        $course = $this->iriConverter->getResourceFromIri($request->request->get('course') ??
            throw new BadRequestHttpException('"course" is required'));
        $dto->course = $course;
        /** @var DocumentCategoryApi $category */
        $category = $this->iriConverter->getResourceFromIri($request->request->get('category') ??
            throw new BadRequestHttpException('"category" is required'));
        $dto->category = $category;

        $dto->year = $request->request->get('year');

        $anonymous = $request->request->get('anonymous') === 'true';
        $dto->anonymous = $anonymous;

        $dto->tags = [];
        // Get all tags from the request (Symfony collects multiple 'tags' parameters as an array)
        $tagsArray = $request->request->all('tags');
        if (!empty($tagsArray)) {
            foreach ($tagsArray as $tagIri) {
                if (empty($tagIri)) {
                    continue;
                }
                try {
                    /** @var TagApi $tag */
                    $tag = $this->iriConverter->getResourceFromIri($tagIri);
                    $dto->tags[] = $tag;
                } catch (Exception $e) {
                    throw new BadRequestHttpException($e->getMessage() . ' - Invalid tag IRI: ' . $tagIri);
                }
            }
        }

        // Convert the documentDto to an actual Document.
        $document = $this->microMapper->map($dto, Document::class);
        assert($document instanceof Document);

        $uploadedFile = $request->files->get('file');
        if (!$uploadedFile) {
            throw new BadRequestHttpException('"file" is required');
        }

        $document->setFile($uploadedFile);

        // Persist the document to the database.
        $this->entityManager->persist($document);
        $this->entityManager->flush();

        // Add the id of the persisted document to the dto.
        $dto->id = $document->getId();
        // Generate the url to the file.
        $dto->contentUrl = $this->storage->resolveUri($document, 'file');

        // The return value is the object that gets send as reply to the user calling the API endpoint.
        return $dto;
    }
}
