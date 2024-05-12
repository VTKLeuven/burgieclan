<?php

namespace App\Mapper;

use App\ApiResource\DocumentCommentApi;
use App\Entity\Document;
use App\Entity\DocumentComment;
use App\Repository\DocumentCommentRepository;
use Exception;
use Symfony\Bundle\SecurityBundle\Security;
use Symfonycasts\MicroMapper\AsMapper;
use Symfonycasts\MicroMapper\MapperInterface;
use Symfonycasts\MicroMapper\MicroMapperInterface;

#[AsMapper(from: DocumentCommentApi::class, to: DocumentComment::class)]
class DocumentCommentApiToEntityMapper implements MapperInterface
{
    public function __construct(
        private readonly DocumentCommentRepository $repository,
        private readonly Security                  $security,
        private readonly MicroMapperInterface      $microMapper,
    ) {
    }

    /**
     * @throws Exception
     */
    public function load(object $from, string $toClass, array $context): object
    {
        assert($from instanceof DocumentCommentApi);

        $entity = $from->id ? $this->repository->find($from->id) : new DocumentComment($this->security->getUser());
        if (!$entity) {
            throw new Exception('Document comment not found');
        }

        return $entity;
    }

    public function populate(object $from, object $to, array $context): object
    {
        assert($from instanceof DocumentCommentApi);
        assert($to instanceof DocumentComment);

        $to->setContent($from->content);
        $to->setAnonymous($from->anonymous);
        $to->setDocument($this->microMapper->map($from->document, Document::class, [
            MicroMapperInterface::MAX_DEPTH => 0,
        ]));

        return $to;
    }
}
