<?php

namespace App\Mapper;

use App\ApiResource\DocumentCommentApi;
use App\ApiResource\DocumentCommentVoteApi;
use App\ApiResource\UserApi;
use App\Entity\DocumentCommentVote;
use Symfonycasts\MicroMapper\AsMapper;
use Symfonycasts\MicroMapper\MapperInterface;
use Symfonycasts\MicroMapper\MicroMapperInterface;

#[AsMapper(from: DocumentCommentVote::class, to: DocumentCommentVoteApi::class)]
class DocumentCommentVoteEntityToApiMapper implements MapperInterface
{
    public function __construct(
        private readonly MicroMapperInterface $microMapper,
    ) {
    }

    public function load(object $from, string $toClass, array $context): object
    {
        assert($from instanceof DocumentCommentVote);

        $dto = new DocumentCommentVoteApi();
        $dto->id = $from->getId();

        return $dto;
    }

    public function populate(object $from, object $to, array $context): object
    {
        assert($from instanceof DocumentCommentVote);
        assert($to instanceof DocumentCommentVoteApi);

        $to->isUpvote = $from->isUpvote();
        $to->comment = $this->microMapper->map($from->getComment(), DocumentCommentApi::class, [
            MicroMapperInterface::MAX_DEPTH => 0,
        ]);
        $to->creator = $this->microMapper->map($from->getCreator(), UserApi::class, [
            MicroMapperInterface::MAX_DEPTH => 0,
        ]);
        $to->createdAt = $from->getCreateDate()->format('Y-m-d H:i:s');
        $to->updatedAt = $from->getUpdateDate()->format('Y-m-d H:i:s');

        return $to;
    }
}
