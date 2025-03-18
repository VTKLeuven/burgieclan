<?php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\Filter\BooleanFilter;
use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Doctrine\Orm\State\Options;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use ApiPlatform\OpenApi\Model;
use App\Entity\Document;
use App\State\EntityClassDtoStateProcessor;
use App\State\EntityClassDtoStateProvider;
use App\State\DocumentProcessor;
use ArrayObject;
use Symfony\Component\HttpFoundation\File\File;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Validator\Constraints as Assert;

#[ApiResource(
    shortName: 'Document',
    operations: [
        new Get(),
        new GetCollection(),
        new Post(
            inputFormats: ['multipart' => ['multipart/form-data']],
            openapi: new Model\Operation(
                requestBody: new Model\RequestBody(
                    content: new ArrayObject([
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
                                        "example" => "24-25"
                                    ],
                                    'file' => [
                                        'type' => 'string',
                                        'format' => 'binary'
                                    ],
                                ]
                            ]
                        ]
                    ])
                )
            ),
            validationContext: ['groups' => ['Default', 'document_create']],
            deserialize: false,
            processor: DocumentProcessor::class
        )    ],
    outputFormats: ['jsonld' => ['application/ld+json']],
    provider: EntityClassDtoStateProvider::class,
    processor: EntityClassDtoStateProcessor::class,
    stateOptions: new Options(entityClass: Document::class),
)]
class DocumentApi
{
    #[ApiProperty(readable: false, writable: false, identifier: true)]
    public ?int $id = null;

    #[Assert\NotBlank]
    #[ApiFilter(SearchFilter::class, strategy: 'ipartial')]
    #[Groups('user:document_views')]
    public ?string $name = null;

    #[ApiFilter(SearchFilter::class, strategy: 'exact')]
    #[Groups('user:document_views')]
    public ?CourseApi $course;

    #[ApiFilter(SearchFilter::class, strategy: 'exact')]
    public ?DocumentCategoryApi $category = null;

    #[Assert\Length(5)]
    #[ApiFilter(SearchFilter::class, strategy: 'ipartial')]
    public ?string $year = null;

    #[ApiProperty(writable: false)]
    #[ApiFilter(BooleanFilter::class)]
    public bool $under_review = true;

    public ?string $contentUrl = null;

    #[Assert\NotNull(groups: ['document_create'])]
    #[ApiProperty(readable: false)]
    public ?File $file = null;

    #[ApiProperty(writable: false)]
    #[ApiFilter(SearchFilter::class, strategy: 'exact')]
    public ?UserApi $creator;

    #[ApiProperty(writable: false)]
    public string $createdAt;

    #[ApiProperty(writable: false)]
    public string $updatedAt;
}
