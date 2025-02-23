<?php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Doctrine\Orm\State\Options;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use App\Entity\Course;
use App\State\EntityClassDtoStateProcessor;
use App\State\EntityClassDtoStateProvider;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Validator\Constraints as Assert;

#[ApiResource(
    shortName: 'Course',
    operations: [
        new Get(),
        new GetCollection(),
    ],
    provider: EntityClassDtoStateProvider::class,
    processor: EntityClassDtoStateProcessor::class,
    stateOptions: new Options(entityClass: Course::class),
)]
class CourseApi
{
    #[ApiProperty(readable: false, writable: false, identifier: true)]
    public ?int $id = null;

    #[Assert\NotBlank]
    #[ApiFilter(SearchFilter::class, strategy: 'ipartial')]
    #[Groups(['search', 'user', 'document:get'])]
    public ?string $name = null;

    #[Assert\NotBlank]
    #[Assert\Length(6)]
    #[ApiFilter(SearchFilter::class, strategy: 'ipartial')]
    #[Groups(['search', 'user', 'document:get'])]
    public ?string $code = null;

    #[Groups('search')]
    public array $professors = [];

    #[Groups('search')]
    public array $semesters = [];

    #[Assert\Positive]
    #[Groups('search')]
    public ?int $credits = null;

    #[Groups(['course:read', 'course:write'])]
    public array $identicalCourses = [];

    /**
     * @var CourseApi[]
     */
    public array $oldCourses = [];

    /**
     * @var CourseApi[]
     */
    public array $newCourses = [];

    /**
     * @var ModuleApi[]
     */
    public array $modules = [];

    /**
     * @var CourseCommentApi[]
     */
    public array $courseComments = [];

}
