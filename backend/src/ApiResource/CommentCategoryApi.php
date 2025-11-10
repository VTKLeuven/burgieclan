<?php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\State\Options;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use App\Entity\CommentCategory;
use App\Filter\MultiLangSearchFilter;
use App\State\EntityClassDtoStateProcessor;
use App\State\EntityClassDtoStateProvider;
use Symfony\Component\Validator\Constraints as Assert;

#[ApiResource(
    shortName: 'Comment Category',
    operations: [
        new Get(),
        new GetCollection(),
    ],
    provider: EntityClassDtoStateProvider::class,
    processor: EntityClassDtoStateProcessor::class,
    stateOptions: new Options(entityClass: CommentCategory::class),
)]
class CommentCategoryApi
{
    #[ApiProperty(readable: false, writable: false, identifier: true)]
    public ?int $id = null;

    #[Assert\NotBlank]
    #[ApiFilter(
        MultiLangSearchFilter::class,
        properties: [
        'name' => ['name_nl', 'name_en'],
        ]
    )]
    public ?string $name = null;

    #[ApiFilter(
        MultiLangSearchFilter::class,
        properties: [
        'description' => ['description_nl', 'description_en'],
        ]
    )]
    public ?string $description = null;
}
