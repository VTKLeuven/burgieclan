<?php

namespace App\Mapper;

use App\ApiResource\CommentCategoryApi;
use App\ApiResource\CourseApi;
use App\ApiResource\CourseRatingApi;
use App\Constants\MappingContext;
use App\Entity\CourseRating;
use Symfonycasts\MicroMapper\AsMapper;
use Symfonycasts\MicroMapper\MicroMapperInterface;

#[AsMapper(from: CourseRating::class, to: CourseRatingApi::class)]
class CourseRatingEntityToApiMapper extends BaseEntityToApiMapper
{
    public function __construct(
        private readonly MicroMapperInterface $microMapper,
    ) {}

    public function load(object $from, string $toClass, array $context): object
    {
        assert($from instanceof CourseRating);

        $dto = new CourseRatingApi();
        $this->mapBaseFields($from, $dto);

        return $dto;
    }

    public function populate(object $from, object $to, array $context): object
    {
        assert($from instanceof CourseRating);
        assert($to instanceof CourseRatingApi);

        $to->value = $from->getValue();
        $to->academicYear = $from->getAcademicYear();
        $to->course = $this->microMapper->map(
            $from->getCourse(),
            CourseApi::class,
            [
                MappingContext::SUMMARY => true,
                MicroMapperInterface::MAX_DEPTH => 1,
            ]
        );
        $to->category = $this->microMapper->map(
            $from->getCategory(),
            CommentCategoryApi::class,
            [
                MicroMapperInterface::MAX_DEPTH => 1,
                'lang' => $context['lang'] ?? null,
            ]
        );

        return $to;
    }
}
