<?php

namespace App\Mapper;

use App\ApiResource\QuickLinkApi;
use App\Entity\QuickLink;
use Symfonycasts\MicroMapper\AsMapper;

#[AsMapper(from: QuickLink::class, to: QuickLinkApi::class)]
class QuickLinkEntityToApiMapper extends BaseEntityToApiMapper
{
    public function load(object $from, string $toClass, array $context): object
    {
        assert($from instanceof QuickLink);

        $dto = new QuickLinkApi();
        $this->mapBaseFields($from, $dto);

        return $dto;
    }

    public function populate(object $from, object $to, array $context): object
    {
        assert($from instanceof QuickLink);
        assert($to instanceof QuickLinkApi);

        $lang = $context['lang'] ?? QuickLink::$DEFAULT_LANGUAGE;

        $to->name = $from->getName($lang);
        $to->linkTo = $from->getLinkTo();

        return $to;
    }
}
