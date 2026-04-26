<?php

namespace App\Mapper;

use App\ApiResource\DocumentCommentApi;
use App\ApiResource\DocumentCommentVoteApi;
use App\ApiResource\UserApi;
use App\Entity\DocumentCommentVote;
use Symfonycasts\MicroMapper\AsMapper;
use Symfonycasts\MicroMapper\MicroMapperInterface;

#[AsMapper(from: DocumentCommentVote::class, to: DocumentCommentVoteApi::class)]
class DocumentCommentVoteEntityToApiMapper extends BaseEntityToApiMapper
{
    public function __construct(
        private readonly MicroMapperInterface $microMapper,
    ) {}

    public function load(object $from, string $toClass, array $context): object
    {
        assert($from instanceof DocumentCommentVote);

        $dto = new DocumentCommentVoteApi();
        $this->mapBaseFields($from, $dto);

        return $dto;
    }

    public function populate(object $from, object $to, array $context): object
    {
        assert($from instanceof DocumentCommentVote);
        assert($to instanceof DocumentCommentVoteApi);

        $to->voteType = $from->getVoteType();
        $to->documentComment = $this->microMapper->map(
            $from->getDocumentComment(),
            DocumentCommentApi::class,
            [
                MicroMapperInterface::MAX_DEPTH => 0,
            ]
        );
        $to->creator = $this->microMapper->map(
            $from->getCreator(),
            UserApi::class,
            [
                MicroMapperInterface::MAX_DEPTH => 0,
            ]
        );
        return $to;
    }
}
