<?php

namespace App\Mapper;

use App\ApiResource\CommentCategoryApi;
use App\Entity\CommentCategory;
use App\Repository\CommentCategoryRepository;
use Exception;
use Symfonycasts\MicroMapper\AsMapper;
use Symfonycasts\MicroMapper\MapperInterface;

#[AsMapper(from: CommentCategoryApi::class, to: CommentCategory::class)]
class CommentCategoryApiToEntityMapper implements MapperInterface
{
    public function __construct(
        private readonly CommentCategoryRepository $repository,
    ) {
    }

    /**
     * @throws Exception
     */
    public function load(object $from, string $toClass, array $context): object
    {
        assert($from instanceof CommentCategoryApi);

        $entity = $from->id ? $this->repository->find($from->id) : null;
        if (!$entity) {
            throw new Exception('Comment category not found');
        }

        return $entity;
    }

    public function populate(object $from, object $to, array $context): object
    {
        assert($from instanceof CommentCategoryApi);
        assert($to instanceof CommentCategory);

        $to->setName($from->name);
        $to->setDescription($from->description);

        return $to;
    }
}
