<?php

namespace App\Mapper;

use App\ApiResource\CourseApi;
use App\ApiResource\DocumentApi;
use App\ApiResource\DocumentCategoryApi;
use App\ApiResource\TagApi;
use App\ApiResource\UserApi;
use App\Entity\Document;
use App\Entity\Tag;
use Symfonycasts\MicroMapper\AsMapper;
use Symfonycasts\MicroMapper\MicroMapperInterface;
use Vich\UploaderBundle\Storage\StorageInterface;

#[AsMapper(from: Document::class, to: DocumentApi::class)]
class DocumentEntityToApiMapper extends BaseEntityToApiMapper
{
    public function __construct(
        private readonly MicroMapperInterface $microMapper,
        private readonly StorageInterface $storage,
    ) {}

    public function load(object $from, string $toClass, array $context): object
    {
        assert($from instanceof Document);

        $dto = new DocumentApi();
        $this->mapBaseFields($from, $dto);

        return $dto;
    }

    public function populate(object $from, object $to, array $context): object
    {
        assert($from instanceof Document);
        assert($to instanceof DocumentApi);

        $to->name = $from->getName();
        $to->course = $this->microMapper->map(
            $from->getCourse(),
            CourseApi::class,
            [
                MicroMapperInterface::MAX_DEPTH => 2,
            ]
        );
        $to->category = $this->microMapper->map(
            $from->getCategory(),
            DocumentCategoryApi::class,
            [
                MicroMapperInterface::MAX_DEPTH => 2,
                'lang' => isset($context['lang']) ? $context['lang'] : null,
            ]
        );
        $to->year = $from->getYear();
        $to->under_review = $from->isUnderReview();
        $to->anonymous = $from->isAnonymous();
        $to->creator = $this->microMapper->map(
            $from->getCreator(),
            UserApi::class,
            [
                MicroMapperInterface::MAX_DEPTH => 1,
            ]
        );
        $to->contentUrl = $this->storage->resolveUri($from, 'file');
        $to->tags = array_map(
            function (Tag $tag) {
                return $this->microMapper->map(
                    $tag,
                    TagApi::class,
                    [
                        MicroMapperInterface::MAX_DEPTH => 1,
                    ]
                );
            },
            $from->getTags()->getValues()
        );

        return $to;
    }
}
