<?php

namespace App\Mapper;

use App\ApiResource\DocumentApi;
use App\ApiResource\TagApi;
use App\Entity\Document;
use App\Entity\Tag;
use Symfonycasts\MicroMapper\AsMapper;
use Symfonycasts\MicroMapper\MapperInterface;
use Symfonycasts\MicroMapper\MicroMapperInterface;

#[AsMapper(from: Tag::class, to: TagApi::class)]
class TagEntityToApiMapper implements MapperInterface
{
    public function __construct(
        private readonly MicroMapperInterface $microMapper,
    ) {
    }

    public function load(object $from, string $toClass, array $context): object
    {
        assert($from instanceof Tag);

        $dto = new TagApi();
        $dto->id = $from->getId();

        return $dto;
    }

    public function populate(object $from, object $to, array $context): object
    {
        assert($from instanceof Tag);
        assert($to instanceof TagApi);

        $to->name = $from->getName();
        $to->documents = array_map(
            function (Document $document) {
                return $this->microMapper->map(
                    $document,
                    DocumentApi::class,
                    [
                    MicroMapperInterface::MAX_DEPTH => 0,
                    ]
                );
            },
            $from->getDocuments()->getValues()
        );

        return $to;
    }
}
