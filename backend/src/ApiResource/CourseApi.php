<?php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Doctrine\Orm\State\Options;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use App\Constants\SerializationGroups;
use App\Entity\Course;
use App\State\EntityClassDtoStateProcessor;
use App\State\EntityClassDtoStateProvider;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Validator\Constraints as Assert;

#[ApiResource(
    shortName: 'Course',
    operations: [
        new Get(normalizationContext: ['groups' => [SerializationGroups::BASE_READ, SerializationGroups::COURSE_GET]]),
        new GetCollection(normalizationContext: ['groups' => [SerializationGroups::BASE_READ, SerializationGroups::COURSE_GET]]),
    ],
    provider: EntityClassDtoStateProvider::class,
    processor: EntityClassDtoStateProcessor::class,
    stateOptions: new Options(entityClass: Course::class),
)]
class CourseApi extends BaseEntityApi
{
    #[Assert\NotBlank]
    #[ApiFilter(SearchFilter::class, strategy: 'ipartial')]
    #[Groups(
        [
            SerializationGroups::COURSE_GET,
            SerializationGroups::PROGRAM_GET,
            SerializationGroups::MODULE_GET,
            SerializationGroups::SEARCH,
            SerializationGroups::USER,
            SerializationGroups::DOCUMENT_GET,
            SerializationGroups::USER_DOCUMENT_VIEWS
        ]
    )]
    public ?string $name = null;

    #[Assert\NotBlank]
    #[Assert\Length(6)]
    #[ApiFilter(SearchFilter::class, strategy: 'ipartial')]
    #[Groups(
        [
            SerializationGroups::COURSE_GET,
            SerializationGroups::PROGRAM_GET,
            SerializationGroups::MODULE_GET,
            SerializationGroups::SEARCH,
            SerializationGroups::USER,
            SerializationGroups::DOCUMENT_GET
        ]
    )]
    public ?string $code = null;

    #[Assert\NotBlank]
    #[Assert\Choice(choices: ['nl', 'en'], message: 'Choose a valid language.')]
    #[Groups([SerializationGroups::COURSE_GET])]
    public ?string $language = null;

    #[Groups(
        [
            SerializationGroups::COURSE_GET,
            SerializationGroups::PROGRAM_GET,
            SerializationGroups::MODULE_GET,
            SerializationGroups::SEARCH
        ]
    )]
    public array $professors = [];

    #[Groups(
        [
            SerializationGroups::COURSE_GET,
            SerializationGroups::PROGRAM_GET,
            SerializationGroups::MODULE_GET,
            SerializationGroups::SEARCH
        ]
    )]
    public array $semesters = [];

    #[Assert\Positive]
    #[Groups(
        [
            SerializationGroups::COURSE_GET,
            SerializationGroups::PROGRAM_GET,
            SerializationGroups::MODULE_GET,
            SerializationGroups::SEARCH
        ]
    )]
    public ?int $credits = null;

    /**
     * @var CourseApi[]
     */
    #[Groups([SerializationGroups::COURSE_GET])]
    public array $identicalCourses = [];

    /**
     * @var CourseApi[]
     */
    #[Groups([SerializationGroups::COURSE_GET])]
    public array $oldCourses = [];

    /**
     * @var CourseApi[]
     */
    #[Groups([SerializationGroups::COURSE_GET])]
    public array $newCourses = [];

    /**
     * @var ModuleApi[]
     */
    #[Groups([SerializationGroups::COURSE_GET])]
    public array $modules = [];

    /**
     * @var CourseCommentApi[]
     */
    #[Groups([SerializationGroups::COURSE_GET])]
    public array $courseComments = [];
}
