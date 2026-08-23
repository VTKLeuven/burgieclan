<?php

namespace App\Mapper;

use App\ApiResource\TagApi;
use App\Entity\Tag;
use Symfonycasts\MicroMapper\AsMapper;

// A TagApi carries only its own scalar fields, so unlike the other mappers this
// one never needs to recurse and therefore takes no MicroMapperInterface.
#[AsMapper(from: Tag::class, to: TagApi::class)]
class TagEntityToApiMapper extends BaseEntityToApiMapper
{
    public function load(object $from, string $toClass, array $context): object
    {
        assert($from instanceof Tag);

        $dto = new TagApi();
        $this->mapBaseFields($from, $dto);

        return $dto;
    }

    public function populate(object $from, object $to, array $context): object
    {
        assert($from instanceof Tag);
        assert($to instanceof TagApi);

        $to->name = $from->getName();

        return $to;
    }
}
