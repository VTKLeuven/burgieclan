<?php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\State\Options;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\OpenApi\Model\Operation;
use ApiPlatform\OpenApi\Model\Parameter;
use App\Constants\SerializationGroups;
use App\Entity\QuickLink;
use App\State\EntityClassDtoStateProcessor;
use App\State\EntityClassDtoStateProvider;
use Symfony\Component\Serializer\Attribute\Groups;

#[ApiResource(
    shortName: 'QuickLink',
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
                        description: 'The language in which to retrieve the page content'
                    )
                ]
            )
        ),
        new GetCollection(
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
                        description: 'The language in which to retrieve the page content'
                    )
                ]
            )
        ),
    ],
    normalizationContext: ['groups' => [SerializationGroups::BASE_READ, SerializationGroups::QUICKLINK_GET]],
    provider: EntityClassDtoStateProvider::class,
    processor: EntityClassDtoStateProcessor::class,
    stateOptions: new Options(entityClass: QuickLink::class),
)]
class QuickLinkApi extends BaseEntityApi
{
    #[Groups([SerializationGroups::QUICKLINK_GET])]
    public ?string $name = null;

    #[Groups([SerializationGroups::QUICKLINK_GET])]
    public ?string $linkTo = null;
}
