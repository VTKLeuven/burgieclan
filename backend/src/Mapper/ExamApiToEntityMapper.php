<?php

namespace App\Mapper;

use App\ApiResource\ExamApi;
use App\Constants\ExamPeriod;
use App\Entity\Course;
use App\Entity\Exam;
use App\Entity\User;
use App\Repository\ExamRepository;
use LogicException;
use Symfony\Bundle\SecurityBundle\Security;
use Symfonycasts\MicroMapper\AsMapper;
use Symfonycasts\MicroMapper\MapperInterface;
use Symfonycasts\MicroMapper\MicroMapperInterface;

/**
 * Only used to start a reconstruction (POST) and to resolve `copiedFrom` references: there is no
 * operation that changes an existing one through the API.
 */
#[AsMapper(from: ExamApi::class, to: Exam::class)]
class ExamApiToEntityMapper implements MapperInterface
{
    public function __construct(
        private readonly ExamRepository $repository,
        private readonly Security $security,
        private readonly MicroMapperInterface $microMapper,
    ) {}

    public function load(object $from, string $toClass, array $context): object
    {
        assert($from instanceof ExamApi);

        if (null !== $from->id) {
            return $this->repository->find($from->id)
                ?? throw new LogicException(sprintf('Exam %d not found.', $from->id));
        }

        $user = $this->security->getUser();
        assert($user instanceof User);

        if (null === $from->course || null === $from->academicYear || null === $from->period) {
            throw new LogicException('A new exam needs a course, an academic year and a period.');
        }

        return new Exam(
            $user,
            $this->microMapper->map($from->course, Course::class, [MicroMapperInterface::MAX_DEPTH => 0]),
            $from->academicYear,
            ExamPeriod::from($from->period)
        );
    }

    public function populate(object $from, object $to, array $context): object
    {
        assert($from instanceof ExamApi);
        assert($to instanceof Exam);

        // Only a new exam takes a source; an existing one keeps where it came from.
        if (null === $to->getId() && null !== $from->copiedFrom) {
            $to->setCopiedFrom(
                $this->microMapper->map($from->copiedFrom, Exam::class, [MicroMapperInterface::MAX_DEPTH => 0])
            );
        }

        return $to;
    }
}
