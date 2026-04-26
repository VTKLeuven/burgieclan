<?php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\State\Options;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use App\Constants\SerializationGroups;
use App\Entity\DocumentCategory;
use App\Filter\MultiLangSearchFilter;
use App\State\EntityClassDtoStateProcessor;
use App\State\EntityClassDtoStateProvider;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Validator\Constraints as Assert;

#[ApiResource(
    shortName: 'DocumentCategory',
    operations: [
        new Get(),
        new GetCollection(),
    ],
    normalizationContext: ['groups' => [SerializationGroups::BASE_READ, SerializationGroups::DOCUMENT_CATEGORY_GET]],
    provider: EntityClassDtoStateProvider::class,
    processor: EntityClassDtoStateProcessor::class,
    stateOptions: new Options(entityClass: DocumentCategory::class),
)]
class DocumentCategoryApi extends BaseEntityApi
{
    #[Assert\NotBlank]
    #[ApiFilter(
        MultiLangSearchFilter::class,
        properties: [
            'name' => [
                'name_nl',
                'name_en'
            ]
        ]
    )]
    #[Groups([SerializationGroups::DOCUMENT_CATEGORY_GET, SerializationGroups::DOCUMENT_GET])]
    public ?string $name = null;
}
