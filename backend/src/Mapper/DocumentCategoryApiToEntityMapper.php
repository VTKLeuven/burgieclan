<?php

namespace App\Mapper;

use App\ApiResource\DocumentCategoryApi;
use App\Entity\DocumentCategory;
use App\Repository\DocumentCategoryRepository;
use Exception;
use Symfonycasts\MicroMapper\AsMapper;
use Symfonycasts\MicroMapper\MapperInterface;

#[AsMapper(from: DocumentCategoryApi::class, to: DocumentCategory::class)]
class DocumentCategoryApiToEntityMapper implements MapperInterface
{
    public function __construct(
        private readonly DocumentCategoryRepository $repository,
    ) {
    }

    /**
     * @throws Exception
     */
    public function load(object $from, string $toClass, array $context): object
    {
        assert($from instanceof DocumentCategoryApi);

        $entity = $from->id ? $this->repository->find($from->id) : null;
        if (!$entity) {
            throw new Exception('Document category not found');
        }

        return $entity;
    }

    public function populate(object $from, object $to, array $context): object
    {
        assert($from instanceof DocumentCategoryApi);
        assert($to instanceof DocumentCategory);

        // No need to map the properties, only ID is needed here because the entity is loaded in the load method.

        return $to;
    }
}
