<?php

namespace App\Mapper;

use App\ApiResource\DocumentVoteApi;
use App\Entity\Document;
use App\Entity\DocumentVote;
use App\Entity\User;
use App\Repository\DocumentVoteRepository;
use Exception;
use Symfony\Bundle\SecurityBundle\Security;
use Symfonycasts\MicroMapper\AsMapper;
use Symfonycasts\MicroMapper\MapperInterface;
use Symfonycasts\MicroMapper\MicroMapperInterface;

#[AsMapper(from: DocumentVoteApi::class, to: DocumentVote::class)]
class DocumentVoteApiToEntityMapper implements MapperInterface
{
    public function __construct(
        private readonly DocumentVoteRepository  $repository,
        private readonly Security                       $security,
        private readonly MicroMapperInterface           $microMapper,
    ) {
    }

    /**
     * @throws Exception
     */
    public function load(object $from, string $toClass, array $context): object
    {
        assert($from instanceof DocumentVoteApi);

        $user = $this->security->getUser();
        assert($user instanceof User);

        $entity = $from->id ? $this->repository->find($from->id) : new DocumentVote($user);
        if (!$entity) {
            throw new Exception('Document  vote not found');
        }

        return $entity;
    }

    public function populate(object $from, object $to, array $context): object
    {
        assert($from instanceof DocumentVoteApi);
        assert($to instanceof DocumentVote);

        $to->setVoteType($from->voteType);
        $to->setDocument($this->microMapper->map($from->document, Document::class, [
            MicroMapperInterface::MAX_DEPTH => 0,
        ]));

        return $to;
    }
}
