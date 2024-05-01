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
use App\Entity\Document;
use App\State\EntityClassDtoStateProcessor;
use App\State\EntityClassDtoStateProvider;
use Symfony\Component\Validator\Constraints as Assert;

#[ApiResource(
    shortName: 'Document',
    operations: [
        new Get(),
        new GetCollection(),
        new Post(),
    ],
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
    public ?string $name = null;

    #[ApiFilter(SearchFilter::class, strategy: 'exact')]
    public ?CourseApi $course;

    #[ApiFilter(SearchFilter::class, strategy: 'exact')]
    public ?DocumentCategoryApi $category = null;

    #[ApiFilter(BooleanFilter::class)]
    public bool $under_review = true;

    // TODO add a way to upload a file
    // TODO add a way to get the file

    #[ApiFilter(SearchFilter::class, strategy: 'exact')]
    public ?UserApi $creator;

    #[ApiProperty(writable: false)]
    public string $createdAt;

    #[ApiProperty(writable: false)]
    public string $updatedAt;
}
