<?php

namespace App\Mapper;

use App\ApiResource\PageApi;
use App\Entity\Page;
use Symfonycasts\MicroMapper\AsMapper;
use Symfonycasts\MicroMapper\MapperInterface;

#[AsMapper(from: Page::class, to: PageApi::class)]
class PageEntityToApiMapper implements MapperInterface
{

    public function load(object $from, string $toClass, array $context): object
    {
        assert($from instanceof Page);

        $dto = new PageApi();
        $dto->id = $from->getId();

        return $dto;
    }

    public function populate(object $from, object $to, array $context): object
    {
        assert($from instanceof Page);
        assert($to instanceof PageApi);

        $to->name = $from->getName();
        $to->content = $from->getContent();
        $to->urlKey = $from->getUrlKey();
        $to->publicAvailable = $from->isPublicAvailable();

        return $to;
    }
}
