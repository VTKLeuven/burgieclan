<?php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\Filter\BooleanFilter;
use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Doctrine\Orm\State\Options;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Entity\CourseComment;
use App\State\EntityClassDtoStateProcessor;
use App\State\EntityClassDtoStateProvider;

#[ApiResource(
    shortName: 'Course Comment',
    operations: [
        new Get(),
        new GetCollection(),
        new Patch(),
        new Post(),
        new Delete(),
    ],
    provider: EntityClassDtoStateProvider::class,
    processor: EntityClassDtoStateProcessor::class,
    stateOptions: new Options(entityClass: CourseComment::class),
)]
class CourseCommentApi extends AbstractCommentApi
{
    #[ApiProperty(readable: false, writable: false, identifier: true)]
    public ?int $id = null;

    public ?CourseApi $course;

    public ?CommentCategoryApi $category;
}
