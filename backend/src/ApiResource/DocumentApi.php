<?php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\Filter\BooleanFilter;
use ApiPlatform\Doctrine\Orm\Filter\OrderFilter;
use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Doctrine\Orm\State\Options;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use ApiPlatform\OpenApi\Model;
use App\Constants\SerializationGroups;
use App\Controller\Api\CreateDocumentController;
use App\Entity\Document;
use App\Filter\TagFilter;
use App\State\DocumentApiProvider;
use App\State\EntityClassDtoStateProcessor;
use App\State\EntityClassDtoStateProvider;
use ArrayObject;
use Symfony\Component\HttpFoundation\File\File;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Validator\Constraints as Assert;

#[ApiResource(
    shortName: 'Document',
    operations: [
        new Get(
            normalizationContext: ['groups' => [SerializationGroups::BASE_READ, SerializationGroups::DOCUMENT_GET]],
            provider: DocumentApiProvider::class
        ),
        new GetCollection(
            openapi: new Model\Operation(
                parameters: [
                    new Model\Parameter(
                        name: 'tags.name[]',
                        in: 'query',
                        description: 'Filter by multiple tag names (partial match)',
                        required: false,
                        schema: [
                            'type' => 'array',
                            'items' => [
                                'type' => 'string'
                            ]
                        ],
                        style: 'form',
                        explode: true
                    )
                ]
            ),
            normalizationContext: ['groups' => [SerializationGroups::BASE_READ, SerializationGroups::DOCUMENT_GET]],
            provider: DocumentApiProvider::class
        ),
        new Post(
            inputFormats: ['multipart' => ['multipart/form-data']],
            controller: CreateDocumentController::class,
            openapi: new Model\Operation(
                requestBody: new Model\RequestBody(
                    content: new ArrayObject(
                        [
                            'multipart/form-data' => [
                                'schema' => [
                                    'type' => 'object',
                                    'properties' => [
                                        'name' => [
                                            'type' => 'string',
                                            'example' => "document name"
                                        ],
                                        'course' => [
                                            'type' => 'string',
                                            'format' => "iri-reference",
                                            'example' => "/api/courses/1"
                                        ],
                                        "category" => [
                                            "type" => "string",
                                            "format" => "iri-reference",
                                            "example" => "/api/document_categories/1"
                                        ],
                                        "year" => [
                                            "type" => "string",
                                            "example" => "2024 - 2025"
                                        ],
                                        'file' => [
                                            'type' => 'string',
                                            'format' => 'binary'
                                        ],
                                        'anonymous' => [
                                            'type' => 'boolean',
                                            'example' => false
                                        ],
                                        'tags[]' => [
                                            'type' => 'array',
                                            'items' => [
                                                'type' => 'string',
                                                'format' => 'iri-reference',
                                            ],
                                            'example' => ['/api/tags/1', '/api/tags/2'],
                                        ],
                                    ]
                                ],
                                'encoding' => [
                                    'tags[]' => [
                                        'style' => 'form',
                                        'explode' => true,
                                        'allowReserved' => true
                                    ]
                                ]
                            ]
                        ]
                    )
                )
            ),
            validationContext: ['groups' => [SerializationGroups::DOCUMENT_CREATE]],
            normalizationContext: ['groups' => [SerializationGroups::BASE_READ, SerializationGroups::DOCUMENT_CREATE]],
            read: false,
            deserialize: false,
            validate: false,
        )
    ],
    outputFormats: ['jsonld' => ['application/ld+json']],
    provider: EntityClassDtoStateProvider::class,
    processor: EntityClassDtoStateProcessor::class,
    stateOptions: new Options(entityClass: Document::class)
)]
#[ApiFilter(OrderFilter::class)]
class DocumentApi extends NodeApi
{
    #[Assert\NotBlank]
    #[ApiFilter(SearchFilter::class, strategy: 'ipartial')]
    #[Groups(
        [
            SerializationGroups::SEARCH,
            SerializationGroups::USER,
            SerializationGroups::DOCUMENT_GET,
            SerializationGroups::DOCUMENT_CREATE,
            SerializationGroups::USER_DOCUMENT_VIEWS
        ]
    )]
    public ?string $name = null;

    #[ApiFilter(SearchFilter::class, strategy: 'exact')]
    #[Groups(
        [
            SerializationGroups::SEARCH,
            SerializationGroups::USER,
            SerializationGroups::DOCUMENT_GET,
            SerializationGroups::DOCUMENT_CREATE,
            SerializationGroups::USER_DOCUMENT_VIEWS
        ]
    )]
    public ?CourseApi $course;

    #[ApiFilter(SearchFilter::class, strategy: 'exact')]
    #[Groups(
        [
            SerializationGroups::SEARCH,
            SerializationGroups::USER,
            SerializationGroups::DOCUMENT_GET,
            SerializationGroups::DOCUMENT_CREATE
        ]
    )]
    public ?DocumentCategoryApi $category = null;

    #[Assert\Length(5)]
    #[ApiFilter(SearchFilter::class, strategy: 'ipartial')]
    #[Groups([SerializationGroups::DOCUMENT_GET, SerializationGroups::DOCUMENT_CREATE])]
    public ?string $year = null;

    #[ApiProperty(writable: false)]
    #[ApiFilter(BooleanFilter::class)]
    #[Groups([SerializationGroups::SEARCH, SerializationGroups::DOCUMENT_GET])]
    public bool $under_review = true;

    #[ApiFilter(BooleanFilter::class)]
    #[Groups([SerializationGroups::DOCUMENT_GET])]
    public bool $anonymous = false;

    #[Groups([SerializationGroups::DOCUMENT_GET])]
    public ?string $contentUrl = null;

    #[ApiProperty(writable: false)]
    #[Groups([SerializationGroups::DOCUMENT_GET])]
    public ?string $mimetype = null;

    #[ApiProperty(writable: false)]
    #[Groups([SerializationGroups::DOCUMENT_GET])]
    public ?string $filename = null;

    #[ApiProperty(writable: false)]
    #[Groups([SerializationGroups::DOCUMENT_GET])]
    public ?int $fileSize = null;

    #[Assert\NotNull(groups: [SerializationGroups::DOCUMENT_CREATE])]
    #[ApiProperty(readable: false)]
    public ?File $file = null;

    #[ApiProperty(writable: false)]
    #[ApiFilter(
        SearchFilter::class,
        strategy: 'exact',
        properties: ['creator' => 'exact', 'creator.fullName' => 'ipartial']
    )]
    #[Groups([SerializationGroups::SEARCH, SerializationGroups::DOCUMENT_GET])]
    public ?UserApi $creator;

    /**
     * @var TagApi[]
     */
    #[ApiFilter(TagFilter::class, properties: ['tags' => true, 'tags.name' => true])]
    #[Groups(
        [
            SerializationGroups::SEARCH,
            SerializationGroups::USER,
            SerializationGroups::DOCUMENT_GET,
            SerializationGroups::DOCUMENT_CREATE
        ]
    )]
    public array $tags = [];
}
