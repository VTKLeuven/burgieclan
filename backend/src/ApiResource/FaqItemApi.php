<?php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\Filter\BooleanFilter;
use ApiPlatform\Doctrine\Orm\Filter\OrderFilter;
use ApiPlatform\Doctrine\Orm\State\Options;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\OpenApi\Model\Operation;
use ApiPlatform\OpenApi\Model\Parameter;
use App\Constants\SerializationGroups;
use App\Entity\FaqItem;
use App\State\EntityClassDtoStateProcessor;
use App\State\EntityClassDtoStateProvider;
use Symfony\Component\Serializer\Attribute\Groups;

#[ApiResource(
    shortName: 'FaqItem',
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
                        description: 'The language in which to retrieve the FAQ content'
                    )
                ]
            ),
            normalizationContext: ['groups' => [SerializationGroups::BASE_READ, SerializationGroups::FAQ_ITEM_GET]],
        ),
        new GetCollection(
            openapi: new Operation(
                summary: 'Retrieves the collection of published FAQ items.',
                description: 'Retrieves the collection of published FAQ items, ordered by position.',
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
                        description: 'The language in which to retrieve the FAQ content'
                    )
                ]
            ),
            normalizationContext: ['groups' => [SerializationGroups::BASE_READ, SerializationGroups::FAQ_ITEM_GET]],
            order: ['position' => 'ASC'],
        ),
    ],
    provider: EntityClassDtoStateProvider::class,
    processor: EntityClassDtoStateProcessor::class,
    stateOptions: new Options(entityClass: FaqItem::class),
)]
#[ApiFilter(BooleanFilter::class, properties: ['published'])]
#[ApiFilter(OrderFilter::class, properties: ['position'])]
class FaqItemApi extends BaseEntityApi
{
    #[Groups([SerializationGroups::FAQ_ITEM_GET])]
    public ?string $question = null;

    #[Groups([SerializationGroups::FAQ_ITEM_GET])]
    public ?string $answer = null;

    #[ApiProperty(writable: false)]
    #[Groups([SerializationGroups::FAQ_ITEM_GET])]
    public int $position = 0;

    #[ApiProperty(writable: false)]
    #[Groups([SerializationGroups::FAQ_ITEM_GET])]
    public bool $published = true;
}
