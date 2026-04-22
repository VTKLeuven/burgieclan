<?php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\State\Options;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
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
        'name' => ['name_nl',
        'name_en']]
    )]
    #[Groups(['document:get'])]
    public ?string $name = null;
}
