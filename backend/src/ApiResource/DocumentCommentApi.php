<?php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Doctrine\Orm\State\Options;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Entity\DocumentComment;
use App\State\EntityClassDtoStateProcessor;
use App\State\EntityClassDtoStateProvider;

#[ApiResource(
    shortName: 'Document Comment',
    operations: [
        new Get(),
        new GetCollection(),
        new Patch(),
        new Post(),
        new Delete(),
    ],
    provider: EntityClassDtoStateProvider::class,
    processor: EntityClassDtoStateProcessor::class,
    stateOptions: new Options(entityClass: DocumentComment::class),
)]
class DocumentCommentApi extends AbstractCommentApi
{
    #[ApiProperty(readable: false, writable: false, identifier: true)]
    public ?int $id = null;

    #[ApiFilter(SearchFilter::class, strategy: 'exact')]
    public ?DocumentApi $document;
}
