<?php

namespace App\Mapper;

use App\ApiResource\CourseRatingApi;
use App\Constants\AcademicYear;
use App\Entity\CommentCategory;
use App\Entity\Course;
use App\Entity\CourseRating;
use App\Entity\User;
use App\Repository\CourseRatingRepository;
use LogicException;
use Symfony\Bundle\SecurityBundle\Security;
use Symfonycasts\MicroMapper\AsMapper;
use Symfonycasts\MicroMapper\MapperInterface;
use Symfonycasts\MicroMapper\MicroMapperInterface;

#[AsMapper(from: CourseRatingApi::class, to: CourseRating::class)]
class CourseRatingApiToEntityMapper implements MapperInterface
{
    public function __construct(
        private readonly CourseRatingRepository $repository,
        private readonly Security $security,
        private readonly MicroMapperInterface $microMapper,
    ) {}

    /**
     * Resolve which row this rating is, which is what makes a second POST an edit.
     *
     * The row is looked up from the signed-in user plus the course and section being rated -
     * never from an id the client sends - so posting again replaces your own score and there is
     * no request shape that overwrites somebody else's. The unique constraint on
     * (creator, course, category) is the backstop if two requests race.
     */
    public function load(object $from, string $toClass, array $context): object
    {
        assert($from instanceof CourseRatingApi);

        $user = $this->security->getUser();
        assert($user instanceof User);

        $existing = $this->repository->findUserRating(
            $this->course($from),
            $this->category($from),
            $user
        );

        return $existing ?? new CourseRating($user);
    }

    public function populate(object $from, object $to, array $context): object
    {
        assert($from instanceof CourseRatingApi);
        assert($to instanceof CourseRating);

        $to->setCourse($this->course($from));
        $to->setCategory($this->category($from));
        $to->setValue((int) $from->value);
        // Rating the year you are in is overwhelmingly the common case, so it is the default
        // rather than something every client has to compute.
        $to->setAcademicYear($from->academicYear ?? AcademicYear::current());

        return $to;
    }

    private function course(CourseRatingApi $from): Course
    {
        if (null === $from->course) {
            throw new LogicException('A rating needs a course.');
        }

        return $this->microMapper->map($from->course, Course::class, [MicroMapperInterface::MAX_DEPTH => 0]);
    }

    private function category(CourseRatingApi $from): CommentCategory
    {
        if (null === $from->category) {
            throw new LogicException('A rating needs a comment section.');
        }

        return $this->microMapper->map(
            $from->category,
            CommentCategory::class,
            [MicroMapperInterface::MAX_DEPTH => 0]
        );
    }
}
