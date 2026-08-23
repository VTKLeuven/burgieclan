<?php

namespace App\Mapper;

use App\ApiResource\TagApi;
use App\Entity\Tag;
use App\Repository\TagRepository;
use Exception;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;
use Symfonycasts\MicroMapper\AsMapper;
use Symfonycasts\MicroMapper\MapperInterface;

#[AsMapper(from: TagApi::class, to: Tag::class)]
class TagApiToEntityMapper implements MapperInterface
{
    public function __construct(
        private readonly TagRepository $repository,
    ) {}

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

        // Documents are attached from the Document side (POST /api/documents with
        // tags[]), never from here. A tag can carry tens of thousands of documents
        // once the Seafile archive is imported, so TagApi deliberately does not
        // expose them in either direction.

        return $to;
    }
}
