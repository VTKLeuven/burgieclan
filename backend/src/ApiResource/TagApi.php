<?php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\State\Options;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use App\Entity\Tag;
use App\Filter\TagDocumentCategoryFilter;
use App\Filter\TagDocumentCourseFilter;
use App\State\EntityClassDtoStateProcessor;
use App\State\EntityClassDtoStateProvider;
use Symfony\Component\Serializer\Attribute\Groups;

#[ApiResource(
    shortName: 'Tag',
    operations: [
        new Get(),
        new GetCollection(),
        new Post(),
    ],
    provider: EntityClassDtoStateProvider::class,
    processor: EntityClassDtoStateProcessor::class,
    stateOptions: new Options(entityClass: Tag::class),
)]
#[ApiFilter(TagDocumentCategoryFilter::class)]
#[ApiFilter(TagDocumentCourseFilter::class)]
class TagApi
{
    #[ApiProperty(readable: false, writable: false, identifier: true)]
    public ?int $id = null;

    #[Groups(['search', 'user', 'document:get', 'document:create'])]
    public ?string $name = null;

    /**
     * @var DocumentApi[]
     */
    #[Groups(['search', 'user', 'document:get', 'document:create'])]
    public array $documents = [];
}
