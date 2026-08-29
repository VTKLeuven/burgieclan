<?php

namespace App\Mapper;

use App\ApiResource\CourseApi;
use App\ApiResource\DocumentApi;
use App\ApiResource\DocumentCategoryApi;
use App\ApiResource\TagApi;
use App\ApiResource\UserApi;
use App\Constants\MappingContext;
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
                MappingContext::SUMMARY => true,
                MicroMapperInterface::MAX_DEPTH => 1,
            ]
        );
        $to->category = $this->microMapper->map(
            $from->getCategory(),
            DocumentCategoryApi::class,
            [
                MappingContext::SUMMARY => true,
                MicroMapperInterface::MAX_DEPTH => 1,
                'lang' => isset($context['lang']) ? $context['lang'] : null,
            ]
        );
        $to->year = $from->getYear();
        $to->author = $from->getAuthor();
        $to->under_review = $from->isUnderReview();
        $to->anonymous = $from->isAnonymous();
        $to->creator = $this->microMapper->map(
            $from->getCreator(),
            UserApi::class,
            [
                MappingContext::SUMMARY => true,
                MicroMapperInterface::MAX_DEPTH => 1,
            ]
        );
        // Always resolved, unlike the size and MIME type the provider fills in: this is a
        // string built from the stored filename, with no filesystem access behind it, and a
        // document row needs it to offer "open in the browser" next to its download button.
        $to->contentUrl = $this->storage->resolveUri($from, 'file');
        $to->tags = array_map(
            function (Tag $tag) {
                return $this->microMapper->map(
                    $tag,
                    TagApi::class,
                    [
                        // Depth 1, not 0: MicroMapper skips populate() entirely at depth 0,
                        // which would leave every tag with an id and a null name. A TagApi
                        // holds nothing but its name - it no longer carries its documents -
                        // so there is nothing below a tag for a depth to limit, and no
                        // SUMMARY variant to ask for either.
                        MicroMapperInterface::MAX_DEPTH => 1,
                    ]
                );
            },
            $from->getTags()->getValues()
        );

        return $to;
    }
}
