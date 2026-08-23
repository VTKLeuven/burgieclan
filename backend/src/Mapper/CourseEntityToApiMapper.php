<?php

namespace App\Mapper;

use App\ApiResource\CourseApi;
use App\ApiResource\CourseCommentApi;
use App\ApiResource\ModuleApi;
use App\Constants\MappingContext;
use App\Entity\Course;
use App\Entity\CourseComment;
use App\Entity\Module;
use Symfonycasts\MicroMapper\AsMapper;
use Symfonycasts\MicroMapper\MicroMapperInterface;

#[AsMapper(from: Course::class, to: CourseApi::class)]
class CourseEntityToApiMapper extends BaseEntityToApiMapper
{
    public function __construct(
        private readonly MicroMapperInterface $microMapper,
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

        $to->name = $from->getName();
        $to->nameNl = $from->getNameNl();
        $to->nameEn = $from->getNameEn();
        $to->code = $from->getCode();
        $to->language = $from->getLanguage();
        $to->professors = array_values($from->getProfessors());
        $to->semesters = $from->getSemesters();
        $to->credits = $from->getCredits();

        // A course row already has everything it renders. Avoid walking comments, replacement
        // courses and reverse module associations when embedded in a module detail response.
        if ($context[MappingContext::SUMMARY] ?? false) {
            return $to;
        }

        $to->oldCourses = array_map(
            function (Course $course) {
                return $this->microMapper->map(
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
            },
            $from->getOldCourses()->getValues()
        );
        $to->newCourses = array_map(
            function (Course $course) {
                return $this->microMapper->map(
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
            },
            $from->getNewCourses()->getValues()
        );

        $to->identicalCourses = array_map(
            function (Course $course) {
                return $this->microMapper->map(
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
            },
            $from->getIdenticalCourses()->getValues()
        );

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
            $from->getCourseComments()->getValues()
        );
        return $to;
    }
}
