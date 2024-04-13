<?php

namespace App\Mapper;

use App\ApiResource\CommentCategoryApi;
use App\Entity\CommentCategory;
use Symfonycasts\MicroMapper\AsMapper;
use Symfonycasts\MicroMapper\MapperInterface;

#[AsMapper(from: CommentCategory::class, to: CommentCategoryApi::class)]
class CommentCategoryEntityToApiMapper implements MapperInterface
{

    public function load(object $from, string $toClass, array $context): object
    {
        assert($from instanceof CommentCategory);

        $dto = new CommentCategoryApi();
        $dto->id = $from->getId();

        return $dto;
    }

    public function populate(object $from, object $to, array $context): object
    {
        assert($from instanceof CommentCategory);
        assert($to instanceof CommentCategoryApi);

        $to->name = $from->getName();
        $to->description = $from->getDescription();

        return $to;
    }
}
