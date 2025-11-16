<?php

namespace App\Mapper;

use App\ApiResource\DocumentCategoryApi;
use App\Entity\DocumentCategory;
use Symfonycasts\MicroMapper\AsMapper;
use Symfonycasts\MicroMapper\MapperInterface;

#[AsMapper(from: DocumentCategory::class, to: DocumentCategoryApi::class)]
class DocumentCategoryEntityToApiMapper implements MapperInterface
{
    public function load(object $from, string $toClass, array $context): object
    {
        assert($from instanceof DocumentCategory);

        $dto = new DocumentCategoryApi();
        $dto->id = $from->getId();

        return $dto;
    }

    public function populate(object $from, object $to, array $context): object
    {
        assert($from instanceof DocumentCategory);
        assert($to instanceof DocumentCategoryApi);

        $lang = $context['lang'] ?? DocumentCategory::$DEFAULT_LANGUAGE;

        $to->name = $from->getName($lang);

        return $to;
    }
}
