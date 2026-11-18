<?php

namespace App\Mapper;

use App\ApiResource\CourseApi;
use App\ApiResource\CourseCommentApi;
use App\ApiResource\ModuleApi;
use App\Constants\MappingContext;
use App\Entity\Course;
use App\Entity\CourseComment;
use App\Entity\Module;
use App\Repository\CourseCommentRepository;
use App\Repository\DocumentRepository;
use Symfonycasts\MicroMapper\AsMapper;
use Symfonycasts\MicroMapper\MicroMapperInterface;

#[AsMapper(from: Course::class, to: CourseApi::class)]
class CourseEntityToApiMapper extends BaseEntityToApiMapper
{
    public function __construct(
        private readonly MicroMapperInterface $microMapper,
        private readonly DocumentRepository $documentRepository,
        private readonly CourseCommentRepository $courseCommentRepository,
    ) {}

    public function load(object $from, string $toClass, array $context): object
    {
        assert($from instanceof Course);

        $dto = new CourseApi();
        $this->mapBaseFields($from, $dto);

        return $dto;
    }

    public function populate(object $from, object $to, array $context): object
    {
        assert($from instanceof Course);
        assert($to instanceof CourseApi);

        $to->name = $from->getCatalogName();
        $to->nameNl = $from->getNameNl();
        $to->nameEn = $from->getNameEn();
        $to->code = $from->getCode();
        $to->language = $from->getLanguage();
        $to->professors = array_values($from->getProfessors());
        $to->semesters = $from->getSemesters();
        $to->credits = $from->getCredits();

        // A course row already has everything it renders. Avoid walking comments, replacement
        // courses and reverse module associations when embedded in a module detail response.
        // A document category page asks for a summary plus the related courses
        // (`?summary=true&related=true`): it lists their documents too, but renders no comments.
        if ($context[MappingContext::SUMMARY] ?? false) {
            if ($context[MappingContext::WITH_RELATED] ?? false) {
                $this->mapAllRelatedCourses($from, $to);
            }

            return $to;
        }

        $this->mapAllRelatedCourses($from, $to);

        $to->modules = array_map(
            function (Module $module) {
                return $this->microMapper->map(
                    $module,
                    ModuleApi::class,
                    [
                        MicroMapperInterface::MAX_DEPTH => 0,
                    ]
                );
            },
            $from->getModules()->getValues()
        );

        $to->courseComments = array_map(
            function (CourseComment $comment) {
                return $this->microMapper->map(
                    $comment,
                    CourseCommentApi::class,
                    [
                        MicroMapperInterface::MAX_DEPTH => 2,
                    ]
                );
            },
            self::yearlessLast($from->getCourseComments()->getValues())
        );

        $to->documentCounts = $this->documentRepository->countByCategoryForCourse($from);

        // What the category pages also show from identical and older courses. Without it a
        // category that only the predecessor has files in would read as empty and be hidden
        // on the course page, which after a reform is exactly where the exams are.
        // The two parts are counted the way the folder shows them: an identical course's copy of
        // a Seafile file the course already holds is hidden there, an older course's is not.
        $identical = $this->documentRepository->countIdenticalExtrasByCategory(
            $from,
            $from->getIdenticalCourses()->getValues()
        );
        $older = $this->documentRepository->countByCategoryForCourses($from->getOldCourses()->getValues());
        $related = $identical;
        foreach ($older as $categoryId => $count) {
            $related[$categoryId] = ($related[$categoryId] ?? 0) + $count;
        }
        $to->relatedDocumentCounts = $related;

        return $to;
    }

    private function mapAllRelatedCourses(Course $from, CourseApi $to): void
    {
        $to->oldCourses = $this->mapRelatedCourses($from->getOldCourses()->getValues());
        $to->newCourses = $this->mapRelatedCourses($from->getNewCourses()->getValues());
        $to->identicalCourses = $this->mapRelatedCourses($from->getIdenticalCourses()->getValues());
    }

    /**
     * The courses a reader can jump to from this one - predecessors, successors and equivalents -
     * each carrying how many documents and subject evaluations it holds.
     *
     * The count is the reason the link is worth following: after a curriculum reform the current
     * course is often near-empty while its predecessor holds years of exams, and without a number
     * on the badge there is nothing telling the reader that. Counting them together keeps it at
     * one query no matter how many related courses there are.
     *
     * @param Course[] $courses
     * @return CourseApi[]
     */
    private function mapRelatedCourses(array $courses): array
    {
        if ([] === $courses) {
            return [];
        }

        $counts = $this->documentRepository->countPublishedForCourses($courses);
        $commentCounts = $this->courseCommentRepository->countForCourses($courses);

        return array_map(
            function (Course $course) use ($counts, $commentCounts): CourseApi {
                /** @var CourseApi $dto */
                $dto = $this->microMapper->map(
                    $course,
                    CourseApi::class,
                    [
                        // SUMMARY + depth 1, not depth 0: MicroMapper skips populate()
                        // entirely at depth 0, which would leave a related course with an
                        // IRI and no code or name to render. SUMMARY stops it there, so it
                        // does not walk on into its own relations.
                        MappingContext::SUMMARY => true,
                        MicroMapperInterface::MAX_DEPTH => 1,
                    ]
                );
                $dto->documentCount = $counts[$course->getId()] ?? 0;
                $dto->commentCount = $commentCounts[$course->getId()] ?? 0;

                return $dto;
            },
            $courses
        );
    }

    /**
     * Move comments with no academic year behind the dated ones, keeping the database order
     * within each group.
     *
     * The association is already ordered by academicYear DESC, but Postgres sorts nulls first
     * on a descending order and Doctrine's OrderBy attribute rejects "DESC NULLS LAST", so
     * undated comments would otherwise open the list. Partitioning rather than re-sorting
     * keeps the ordering decision in exactly one place - the mapping on Course.
     *
     * @param CourseComment[] $comments
     * @return CourseComment[]
     */
    private static function yearlessLast(array $comments): array
    {
        $dated = [];
        $undated = [];
        foreach ($comments as $comment) {
            if (null === $comment->getAcademicYear()) {
                $undated[] = $comment;
            } else {
                $dated[] = $comment;
            }
        }

        return [...$dated, ...$undated];
    }
}
