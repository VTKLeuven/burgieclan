<?php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\State\Options;
use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use App\Entity\Page;
use App\State\EntityClassDtoStateProcessor;
use App\State\EntityClassDtoStateProvider;
use App\State\PageApiProvider;
use Symfony\Component\Validator\Constraints as Assert;

#[ApiResource(
    shortName: 'Page',
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
                        'description' => 'The language in which to retrieve the page content'
                    ]
                ]
            ],
            security: 'is_granted("VIEW", object)', // Handled by the src/Security/Voter/PageVoter
            provider: PageApiProvider::class
        ),
        new GetCollection(
            openapiContext: [
                'summary' => 'Retrieves the collection of publicly available Page resources.',
                'description' => 'Retrieves the collection of publicly available Page resources.',
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
                        'description' => 'The language in which to retrieve the page content'
                    ]
                ]
            ],
            paginationEnabled: false,
            provider: PageApiProvider::class,
        )
    ],
    provider: EntityClassDtoStateProvider::class,
    processor: EntityClassDtoStateProcessor::class,
    stateOptions: new Options(entityClass: Page::class),
)]
class PageApi
{
    #[ApiProperty(readable: true, writable: false, identifier: true)]
    #[Assert\NotBlank]
    #[Assert\Length(max: 255)]
    public ?string $urlKey = null;

    #[Assert\NotBlank]
    #[Assert\Length(max: 255)]
    public ?string $name = null;

    #[Assert\NotBlank]
    public ?string $content = null;

    public bool $publicAvailable = false;
}
