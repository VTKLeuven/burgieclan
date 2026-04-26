<?php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\Filter\DateFilter;
use ApiPlatform\Doctrine\Orm\State\Options;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\OpenApi\Model\Operation;
use ApiPlatform\OpenApi\Model\Parameter;
use App\Constants\SerializationGroups;
use App\Entity\Announcement;
use App\Filter\MultiLangSearchFilter;
use App\State\EntityClassDtoStateProcessor;
use App\State\EntityClassDtoStateProvider;
use Symfony\Component\Serializer\Attribute\Groups;

#[ApiResource(
    shortName: 'Announcement',
    operations: [
        new Get(
            openapi: new Operation(
                parameters: [
                    new Parameter(
                        name: 'lang',
                        in: 'query',
                        required: false,
                        schema: [
                            'type' => 'string',
                            'enum' => ['nl', 'en'],
                            'default' => 'nl'
                        ],
                        description: 'The language in which to retrieve the announcement content'
                    )
                ]
            ),
            normalizationContext: ['groups' => [SerializationGroups::BASE_READ, SerializationGroups::ANNOUNCEMENT_GET]],
        ),
        new GetCollection(
            openapi: new Operation(
                summary: 'Retrieves the collection of Announcement resources.',
                description: 'Retrieves the collection of Announcement resources.',
                parameters: [
                    new Parameter(
                        name: 'lang',
                        in: 'query',
                        required: false,
                        schema: [
                            'type' => 'string',
                            'enum' => ['nl', 'en'],
                            'default' => 'nl'
                        ],
                        description: 'The language in which to retrieve the announcement content'
                    )
                ]
            ),
            normalizationContext: ['groups' => [SerializationGroups::BASE_READ, SerializationGroups::ANNOUNCEMENT_GET]],
        ),
    ],
    provider: EntityClassDtoStateProvider::class,
    processor: EntityClassDtoStateProcessor::class,
    stateOptions: new Options(entityClass: Announcement::class),
)]
class AnnouncementApi extends NodeApi
{
    #[ApiFilter(
        MultiLangSearchFilter::class,
        properties: [
            'title' => ['title_nl', 'title_en'],
        ]
    )]
    #[Groups([SerializationGroups::ANNOUNCEMENT_GET])]
    public ?string $title = null;

    #[ApiFilter(
        MultiLangSearchFilter::class,
        properties: [
            'content' => ['content_nl', 'content_en'],
        ]
    )]
    #[Groups([SerializationGroups::ANNOUNCEMENT_GET])]
    public ?string $content = null;

    #[Groups([SerializationGroups::ANNOUNCEMENT_GET])]
    public ?UserApi $creator;

    #[ApiFilter(DateFilter::class)]
    #[Groups([SerializationGroups::ANNOUNCEMENT_GET])]
    public string $startTime;

    #[ApiFilter(DateFilter::class)]
    #[Groups([SerializationGroups::ANNOUNCEMENT_GET])]
    public string $endTime;

    #[ApiProperty(writable: false)]
    #[Groups([SerializationGroups::ANNOUNCEMENT_GET])]
    public bool $priority;
}
