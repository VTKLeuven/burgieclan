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
        new Get(normalizationContext: ['groups' => ['course:get']]),
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
    #[Groups(['course:get', 'program:get', 'search', 'user', 'document:get', 'user:document_views'])]
    public ?string $name = null;

    #[Assert\NotBlank]
    #[Assert\Length(6)]
    #[ApiFilter(SearchFilter::class, strategy: 'ipartial')]
    #[Groups(['course:get', 'program:get', 'search', 'user', 'document:get'])]
    public ?string $code = null;

    #[Assert\NotBlank]
    #[Assert\Choice(choices: ['nl', 'en'], message: 'Choose a valid language.')]
    #[Groups(['course:get'])]
    public ?string $language = null;

    #[Groups(['course:get', 'program:get', 'search'])]
    public array $professors = [];

    #[Groups(['course:get', 'program:get', 'search'])]
    public array $semesters = [];

    #[Assert\Positive]
    #[Groups(['course:get', 'program:get', 'search'])]
    public ?int $credits = null;

    /**
     * @var CourseApi[]
     */
    #[Groups(['course:get'])]
    public array $identicalCourses = [];

    /**
     * @var CourseApi[]
     */
    #[Groups(['course:get'])]
    public array $oldCourses = [];

    /**
     * @var CourseApi[]
     */
    #[Groups(['course:get'])]
    public array $newCourses = [];

    /**
     * @var ModuleApi[]
     */
    #[Groups(['course:get'])]
    public array $modules = [];

    /**
     * @var CourseCommentApi[]
     */
    #[Groups(['course:get'])]
    public array $courseComments = [];
}
