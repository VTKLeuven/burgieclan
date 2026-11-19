<?php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Doctrine\Orm\State\Options;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use App\Constants\SerializationGroups;
use App\Controller\Api\GetCoursePathsController;
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
        // Lets a course page name the branch it sits in without downloading the curriculum.
        new Get(
            uriTemplate: 'courses/{id}/paths',
            controller: GetCoursePathsController::class,
            read: false,
            name: 'course_paths',
        ),
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

    /**
     * The Dutch and English titles as published by KU Leuven. Null when there is no title in that
     * language. Display $name: it is already the title in the course's own language ($language).
     */
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
    public ?string $nameNl = null;

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
    public ?string $nameEn = null;

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

    /**
     * @var string[]
     */
    #[Groups(
        [
            SerializationGroups::COURSE_GET,
            SerializationGroups::PROGRAM_GET,
            SerializationGroups::MODULE_GET,
            SerializationGroups::SEARCH,
            SerializationGroups::DOCUMENT_GET,
        ]
    )]
    public array $parts = [];

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

    /**
     * @var array<int, int> Map of category ID to document count
     */
    #[Groups([SerializationGroups::COURSE_GET])]
    public array $documentCounts = [];

    /**
     * @var array<int, int> Map of category ID to the number of documents the identical and older
     *                      courses hold there, which the category page lists below this course's own
     */
    #[Groups([SerializationGroups::COURSE_GET])]
    public array $relatedDocumentCounts = [];

    /**
     * Published documents on this course, as a single total.
     *
     * Only filled in for the related courses hanging off a course detail response, where it is
     * the whole point of the link: a reader has no way of knowing that the predecessor of a
     * near-empty course holds a decade of exams. Null everywhere else - counting it for every
     * row of an expanded module would cost a query per course for a number nothing renders.
     */
    #[Groups([SerializationGroups::COURSE_GET])]
    public ?int $documentCount = null;

    /**
     * Subject evaluations (course comments) on this course, as a single total. Like
     * $documentCount, only filled in for the related courses on a course detail response, so the
     * course page can point at evaluations written under a former or equivalent code.
     */
    #[Groups([SerializationGroups::COURSE_GET])]
    public ?int $commentCount = null;
}
