<?php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\State\Options;
use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\OpenApi\Model\Operation;
use ApiPlatform\OpenApi\Model\Parameter;
use App\Constants\SerializationGroups;
use App\Entity\Page;
use App\State\EntityClassDtoStateProcessor;
use App\State\EntityClassDtoStateProvider;
use App\State\PageApiProvider;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Validator\Constraints as Assert;

#[ApiResource(
    shortName: 'Page',
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
            ),
            security: 'is_granted("VIEW", object)', // Handled by the src/Security/Voter/PageVoter
            provider: PageApiProvider::class
        ),
        new GetCollection(
            openapi: new Operation(
                summary: 'Retrieves the collection of publicly available Page resources.',
                description: 'Retrieves the collection of publicly available Page resources.',
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
            ),
            paginationEnabled: false,
            provider: PageApiProvider::class,
        )
    ],
    normalizationContext: ['groups' => [SerializationGroups::BASE_READ, SerializationGroups::PAGE_GET]],
    provider: EntityClassDtoStateProvider::class,
    processor: EntityClassDtoStateProcessor::class,
    stateOptions: new Options(entityClass: Page::class),
)]
class PageApi extends BaseEntityApi
{
    // Override BaseEntityApi: urlKey is the identifier here, not id
    #[ApiProperty(readable: false, writable: false, identifier: false)]
    public ?int $id = null;

    #[ApiProperty(readable: true, writable: false, identifier: true)]
    #[Assert\NotBlank]
    #[Assert\Length(max: 255)]
    #[Groups([SerializationGroups::PAGE_GET])]
    public ?string $urlKey = null;

    #[Assert\NotBlank]
    #[Assert\Length(max: 255)]
    #[Groups([SerializationGroups::PAGE_GET])]
    public ?string $name = null;

    #[Assert\NotBlank]
    #[Groups([SerializationGroups::PAGE_GET])]
    public ?string $content = null;

    #[Groups([SerializationGroups::PAGE_GET])]
    public bool $publicAvailable = false;
}
