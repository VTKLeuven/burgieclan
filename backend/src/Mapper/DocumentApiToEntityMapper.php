<?php

namespace App\Mapper;

use App\ApiResource\DocumentApi;
use App\Entity\Course;
use App\Entity\Document;
use App\Entity\DocumentCategory;
use App\Repository\DocumentRepository;
use Exception;
use Symfony\Bundle\SecurityBundle\Security;
use Symfonycasts\MicroMapper\AsMapper;
use Symfonycasts\MicroMapper\MapperInterface;
use Symfonycasts\MicroMapper\MicroMapperInterface;

#[AsMapper(from: DocumentApi::class, to: Document::class)]
class DocumentApiToEntityMapper implements MapperInterface
{
    public function __construct(
        private readonly DocumentRepository $repository,
        private readonly Security                $security,
        private readonly MicroMapperInterface $microMapper,
    ) {
    }

    /**
     * @throws Exception
     */
    public function load(object $from, string $toClass, array $context): object
    {
        assert($from instanceof DocumentApi);

        $entity = $from->id ? $this->repository->find($from->id) : new Document($this->security->getUser());
        if (!$entity) {
            throw new Exception('Document not found');
        }

        return $entity;
    }

    public function populate(object $from, object $to, array $context): object
    {
        assert($from instanceof DocumentApi);
        assert($to instanceof Document);

        $to->setName($from->name);
        $to->setCourse($this->microMapper->map($from->course, Course::class, [
            MicroMapperInterface::MAX_DEPTH => 0,
        ]));
        $to->setCategory($this->microMapper->map($from->category, DocumentCategory::class, [
            MicroMapperInterface::MAX_DEPTH => 0,
        ]));
        $to->setUnderReview($from->under_review);
        $to->setUpdateDate();

        return $to;
    }
}
