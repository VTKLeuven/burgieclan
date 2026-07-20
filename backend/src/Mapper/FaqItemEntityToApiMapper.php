<?php

namespace App\Mapper;

use App\ApiResource\FaqItemApi;
use App\Entity\FaqItem;
use Symfonycasts\MicroMapper\AsMapper;

#[AsMapper(from: FaqItem::class, to: FaqItemApi::class)]
class FaqItemEntityToApiMapper extends BaseEntityToApiMapper
{
    public function load(object $from, string $toClass, array $context): object
    {
        assert($from instanceof FaqItem);

        $dto = new FaqItemApi();
        $this->mapBaseFields($from, $dto);

        return $dto;
    }

    public function populate(object $from, object $to, array $context): object
    {
        assert($from instanceof FaqItem);
        assert($to instanceof FaqItemApi);

        $lang = $context['lang'] ?? FaqItem::$DEFAULT_LANGUAGE;

        $to->question = $from->getQuestion($lang);
        $to->answer = $from->getAnswer($lang);
        $to->position = $from->getPosition();
        $to->published = $from->isPublished();

        return $to;
    }
}
