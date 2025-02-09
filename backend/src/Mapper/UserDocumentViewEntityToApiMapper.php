<?php

namespace App\Mapper;

use App\ApiResource\DocumentApi;
use App\ApiResource\UserDocumentViewApi;
use App\Entity\UserDocumentView;
use Symfonycasts\MicroMapper\AsMapper;
use Symfonycasts\MicroMapper\MapperInterface;
use Symfonycasts\MicroMapper\MicroMapperInterface;

#[AsMapper(from: UserDocumentView::class, to: UserDocumentViewApi::class)]
class UserDocumentViewEntityToApiMapper implements MapperInterface
{
    public function __construct(
        private readonly MicroMapperInterface $microMapper,
    ) {
    }

    public function load(object $from, string $toClass, array $context): object
    {
        assert($from instanceof UserDocumentView);

        $dto = new UserDocumentViewApi();
        $dto->id = $from->getId();

        return $dto;
    }

    public function populate(object $from, object $to, array $context): object
    {
        assert($from instanceof UserDocumentView);
        assert($to instanceof UserDocumentViewApi);

        $to->document = $this->microMapper->map($from->getDocument(), DocumentApi::class, [
            // Depth: document (0), course (1), course props (2)
            MicroMapperInterface::MAX_DEPTH => 2,
        ]);
        $to->lastViewed = $from->getLastViewedAt();

        return $to;
    }
}
