<?php

namespace App\Mapper;

use App\ApiResource\DocumentApi;
use App\ApiResource\DocumentCommentApi;
use App\ApiResource\UserApi;
use App\Entity\DocumentComment;
use Symfonycasts\MicroMapper\AsMapper;
use Symfonycasts\MicroMapper\MapperInterface;
use Symfonycasts\MicroMapper\MicroMapperInterface;

#[AsMapper(from: DocumentComment::class, to: DocumentCommentApi::class)]
class DocumentCommentEntityToApiMapper implements MapperInterface
{
    public function __construct(
        private readonly MicroMapperInterface $microMapper,
    ) {
    }

    public function load(object $from, string $toClass, array $context): object
    {
        assert($from instanceof DocumentComment);

        $dto = new DocumentCommentApi();
        $dto->id = $from->getId();

        return $dto;
    }

    public function populate(object $from, object $to, array $context): object
    {
        assert($from instanceof DocumentComment);
        assert($to instanceof DocumentCommentApi);

        $to->content = $from->getContent();
        $to->anonymous = $from->isAnonymous();
        $to->document = $this->microMapper->map($from->getDocument(), DocumentApi::class, [
            MicroMapperInterface::MAX_DEPTH => 0,
        ]);
        $to->creator = $this->microMapper->map($from->getCreator(), UserApi::class, [
            MicroMapperInterface::MAX_DEPTH => 1,
        ]);
        $to->createdAt = $from->getCreateDate()->format('Y-m-d H:i:s');
        $to->updatedAt = $from->getUpdateDate()->format('Y-m-d H:i:s');

        return $to;
    }
}
