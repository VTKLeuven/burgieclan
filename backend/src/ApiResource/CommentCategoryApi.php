<?php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\State\Options;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use App\Constants\SerializationGroups;
use App\Entity\CommentCategory;
use App\Filter\MultiLangSearchFilter;
use App\State\EntityClassDtoStateProcessor;
use App\State\EntityClassDtoStateProvider;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Validator\Constraints as Assert;

#[ApiResource(
    shortName: 'CommentCategory',
    operations: [
        new Get(),
        new GetCollection(),
    ],
    normalizationContext: ['groups' => [SerializationGroups::BASE_READ, SerializationGroups::COMMENT_CATEGORY_GET]],
    provider: EntityClassDtoStateProvider::class,
    processor: EntityClassDtoStateProcessor::class,
    stateOptions: new Options(entityClass: CommentCategory::class),
)]
class CommentCategoryApi extends BaseEntityApi
{
    #[Assert\NotBlank]
    #[ApiFilter(
        MultiLangSearchFilter::class,
        properties: [
            'name' => ['name_nl', 'name_en'],
        ]
    )]
    #[Groups([SerializationGroups::COMMENT_CATEGORY_GET])]
    public ?string $name = null;

    #[ApiFilter(
        MultiLangSearchFilter::class,
        properties: [
            'description' => ['description_nl', 'description_en'],
        ]
    )]
    #[Groups([SerializationGroups::COMMENT_CATEGORY_GET])]
    public ?string $description = null;
}
