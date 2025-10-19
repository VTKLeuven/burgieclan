<?php

namespace App\Mapper;

use App\ApiResource\TagApi;
use App\Entity\Document;
use App\Entity\Tag;
use App\Repository\TagRepository;
use Exception;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;
use Symfonycasts\MicroMapper\AsMapper;
use Symfonycasts\MicroMapper\MapperInterface;
use Symfonycasts\MicroMapper\MicroMapperInterface;

#[AsMapper(from: TagApi::class, to: Tag::class)]
class TagApiToEntityMapper implements MapperInterface
{
    public function __construct(
        private readonly TagRepository        $repository,
        private readonly MicroMapperInterface $microMapper,
    ) {
    }

    /**
     * @throws Exception
     */
    public function load(object $from, string $toClass, array $context): object
    {
        assert($from instanceof TagApi);

        $entity = null;

        // First try to find by ID if provided
        if ($from->id) {
            $entity = $this->repository->find($from->id);
        }

        // If not found by ID, try to find by name
        if (!$entity && $from->name) {
            $entity = $this->repository->findOneBy(['name' => $from->name]);
        }

        // If still not found, create a new Tag
        if (!$entity) {
            $entity = new Tag();
        }

        return $entity;
    }

    public function populate(object $from, object $to, array $context): object
    {
        assert($from instanceof TagApi);
        assert($to instanceof Tag);

        if (!$from->name) {
            throw new UnprocessableEntityHttpException('Tag name is required');
        }
        $to->setName($from->name);

        foreach ($from->documents as $document) {
            $documentEntity = $this->microMapper->map($document, Document::class, [
                MicroMapperInterface::MAX_DEPTH => 0,
            ]);
            $to->addDocument($documentEntity);
        }

        return $to;
    }
}
