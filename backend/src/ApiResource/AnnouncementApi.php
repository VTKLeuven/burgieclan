<?php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\Filter\DateFilter;
use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Doctrine\Orm\State\Options;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use App\Entity\Announcement;
use App\Filter\MultiLangSearchFilter;
use App\State\EntityClassDtoStateProcessor;
use App\State\EntityClassDtoStateProvider;

#[ApiResource(
    shortName: 'Announcement',
    operations: [
        new Get(
            openapiContext: [
                'parameters' => [
                    [
                        'name' => 'lang',
                        'in' => 'query',
                        'required' => false,
                        'schema' => [
                            'type' => 'string',
                            'enum' => ['nl', 'en'],
                            'default' => 'nl'
                        ],
                        'description' => 'The language in which to retrieve the announcement content'
                    ]
                ]
            ]
        ),
        new GetCollection(
            openapiContext: [
                'summary' => 'Retrieves the collection of Announcement resources.',
                'description' => 'Retrieves the collection of Announcement resources.',
                'parameters' => [
                    [
                        'name' => 'lang',
                        'in' => 'query',
                        'required' => false,
                        'schema' => [
                            'type' => 'string',
                            'enum' => ['nl', 'en'],
                            'default' => 'nl'
                        ],
                        'description' => 'The language in which to retrieve the announcement content'
                    ]
                ]
            ]
        ),
    ],
    provider: EntityClassDtoStateProvider::class,
    processor: EntityClassDtoStateProcessor::class,
    stateOptions: new Options(entityClass: Announcement::class),
)]
class AnnouncementApi
{
    #[ApiProperty(readable: false, writable: false, identifier: true)]
    public ?int $id = null;

    #[ApiFilter(MultiLangSearchFilter::class, properties: [
        'title' => ['title_nl', 'title_en'],
    ])]
    public ?string $title = null;

    #[ApiFilter(MultiLangSearchFilter::class, properties: [
        'content' => ['content_nl', 'content_en'],
    ])]
    public ?string $content = null;

    public ?UserApi $creator;

    #[ApiFilter(DateFilter::class)]
    public string $startTime;

    #[ApiFilter(DateFilter::class)]
    public string $endTime;

    #[ApiProperty(writable: false)]
    public string $createdAt;

    #[ApiProperty(writable: false)]
    public string $updatedAt;

    #[ApiProperty(writable: false)]
    public bool $priority;
}
