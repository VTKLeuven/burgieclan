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
    public ?string $name = null;

    #[Assert\NotBlank]
    #[Assert\Length(6)]
    #[ApiFilter(SearchFilter::class, strategy: 'ipartial')]
    public ?string $code = null;

    #[Assert\NotBlank]
    #[Assert\Choice(choices: ['nl', 'en'], message: 'Choose a valid language.')]
    public ?string $language = null;

    public array $professors = [];

    public array $semesters = [];

    #[Assert\Positive]
    public ?int $credits = null;

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
