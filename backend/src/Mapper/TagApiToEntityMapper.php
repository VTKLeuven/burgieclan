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

        $entity = $from->id ? $this->repository->find($from->id) : new Tag();
        if ($from->id && !$entity) {
            throw new Exception('Tag not found');
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
