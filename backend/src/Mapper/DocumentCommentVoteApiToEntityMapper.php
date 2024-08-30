<?php

namespace App\Mapper;

use App\ApiResource\DocumentCommentVoteApi;
use App\Entity\DocumentComment;
use App\Entity\DocumentCommentVote;
use App\Repository\DocumentCommentVoteRepository;
use Exception;
use Symfony\Bundle\SecurityBundle\Security;
use Symfonycasts\MicroMapper\AsMapper;
use Symfonycasts\MicroMapper\MapperInterface;
use Symfonycasts\MicroMapper\MicroMapperInterface;

#[AsMapper(from: DocumentCommentVoteApi::class, to: DocumentCommentVote::class)]
class DocumentCommentVoteApiToEntityMapper implements MapperInterface
{
    public function __construct(
        private readonly DocumentCommentVoteRepository  $repository,
        private readonly Security                       $security,
        private readonly MicroMapperInterface           $microMapper,
    ) {
    }

    /**
     * @throws Exception
     */
    public function load(object $from, string $toClass, array $context): object
    {
        assert($from instanceof DocumentCommentVoteApi);

        $entity = $from->id ? $this->repository->find($from->id) : new DocumentCommentVote($this->security->getUser());
        if (!$entity) {
            throw new Exception('Document comment vote not found');
        }

        return $entity;
    }

    public function populate(object $from, object $to, array $context): object
    {
        assert($from instanceof DocumentCommentVoteApi);
        assert($to instanceof DocumentCommentVote);

        $to->setUpvote($from->isUpvote);
        $to->setComment($this->microMapper->map($from->comment, DocumentComment::class, [
            MicroMapperInterface::MAX_DEPTH => 0,
        ]));

        return $to;
    }
}
