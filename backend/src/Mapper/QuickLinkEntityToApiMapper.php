<?php

namespace App\Mapper;

use App\ApiResource\QuickLinkApi;
use App\Entity\QuickLink;
use Symfonycasts\MicroMapper\AsMapper;
use Symfonycasts\MicroMapper\MapperInterface;

#[AsMapper(from: QuickLink::class, to: QuickLinkApi::class)]
class QuickLinkEntityToApiMapper implements MapperInterface
{
    public function load(object $from, string $toClass, array $context): object
    {
        assert($from instanceof QuickLink);

        $dto = new QuickLinkApi();
        $dto->id = $from->getId();

        return $dto;
    }

    public function populate(object $from, object $to, array $context): object
    {
        assert($from instanceof QuickLink);
        assert($to instanceof QuickLinkApi);

        $to->name = $from->getName();
        $to->linkTo = $from->getLinkTo();

        return $to;
    }
}
