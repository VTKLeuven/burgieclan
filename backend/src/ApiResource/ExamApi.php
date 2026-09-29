<?php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Doctrine\Orm\State\Options;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use App\Constants\ExamPeriod;
use App\Constants\SerializationGroups;
use App\Entity\Exam;
use App\State\EntityClassDtoStateProvider;
use App\State\ExamCreateProcessor;
use App\Validator\NewExam;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * An exam reconstruction (see App\Entity\Exam).
 *
 * The questions are edited live on the collab server, never through this resource: the frontend
 * opens `documentName` there with a token from POST /api/collab/token. What this resource adds is
 * which reconstructions exist, starting a new one, whether it is still open, and a read-only copy
 * of the content (`content`, `sittings`) to show before the live document has loaded, or when
 * the collab server is unavailable.
 *
 * Moderators lock, reopen and roll back in the admin, not here.
 */
#[ApiResource(
    shortName: 'Exam',
    operations: [
        new Get(
            normalizationContext: [
                'groups' => [
                    SerializationGroups::BASE_READ,
                    SerializationGroups::EXAM_GET,
                    SerializationGroups::EXAM_DETAIL,
                ],
            ],
        ),
        new GetCollection(),
        new Post(processor: ExamCreateProcessor::class),
    ],
    normalizationContext: ['groups' => [SerializationGroups::BASE_READ, SerializationGroups::EXAM_GET]],
    denormalizationContext: ['groups' => [SerializationGroups::EXAM_CREATE]],
    order: ['academicYear' => 'DESC', 'id' => 'DESC'],
    provider: EntityClassDtoStateProvider::class,
    stateOptions: new Options(entityClass: Exam::class),
)]
#[NewExam]
class ExamApi extends BaseEntityApi
{
    #[Assert\NotNull]
    #[ApiFilter(SearchFilter::class, strategy: 'exact')]
    #[Groups([SerializationGroups::EXAM_GET, SerializationGroups::EXAM_CREATE])]
    public ?CourseApi $course = null;

    #[Assert\NotBlank]
    #[Assert\Regex(pattern: '/^\d{4} - \d{4}$/', message: 'Use the format "2024 - 2025".')]
    #[ApiFilter(SearchFilter::class, strategy: 'exact')]
    #[Groups([SerializationGroups::EXAM_GET, SerializationGroups::EXAM_CREATE])]
    public ?string $academicYear = null;

    /**
     * "january", "june", or "august" (the resits in August and September).
     */
    #[Assert\NotBlank]
    #[Assert\Choice(callback: [self::class, 'periods'], message: 'Choose january, june or august.')]
    #[ApiFilter(SearchFilter::class, strategy: 'exact')]
    #[Groups([SerializationGroups::EXAM_GET, SerializationGroups::EXAM_CREATE])]
    public ?string $period = null;

    /**
     * Start as a copy of another reconstruction of the same course, e.g. when the June exam
     * reused January's. Only read when starting one.
     */
    #[Groups([SerializationGroups::EXAM_GET, SerializationGroups::EXAM_CREATE])]
    public ?ExamApi $copiedFrom = null;

    /** Until when everyone may edit it. After that it is read-only until a moderator reopens it. */
    #[ApiProperty(writable: false)]
    #[Groups([SerializationGroups::EXAM_GET])]
    public ?string $editableUntil = null;

    /** Whether it is still open for editing right now. */
    #[ApiProperty(writable: false)]
    #[Groups([SerializationGroups::EXAM_GET])]
    public bool $editable = false;

    /** The live document on the collab server, e.g. "exam-12". */
    #[ApiProperty(writable: false)]
    #[Groups([SerializationGroups::EXAM_GET])]
    public ?string $documentName = null;

    #[ApiProperty(writable: false)]
    #[Groups([SerializationGroups::EXAM_GET])]
    public int $questionCount = 0;

    /**
     * The questions as TipTap JSON, as last stored by the collab server. Null before anyone typed
     * anything. Read-only: render it with the editor schema, never as raw HTML.
     *
     * @var array<string, mixed>|null
     */
    #[ApiProperty(writable: false)]
    #[Groups([SerializationGroups::EXAM_DETAIL])]
    public ?array $content = null;

    /**
     * The days the exam was given on, as [{"id": "…", "label": "ma 20 jan"}], in the stored copy.
     * Each question lists the ids of the days it came up on.
     *
     * @var list<array{id: string, label: string}>
     */
    #[ApiProperty(writable: false)]
    #[Groups([SerializationGroups::EXAM_DETAIL])]
    public array $sittings = [];

    /**
     * @return list<string>
     */
    public static function periods(): array
    {
        return array_map(static fn(ExamPeriod $period): string => $period->value, ExamPeriod::cases());
    }
}
