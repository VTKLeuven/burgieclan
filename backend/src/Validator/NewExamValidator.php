<?php

namespace App\Validator;

use App\ApiResource\ExamApi;
use App\Constants\ExamPeriod;
use App\Repository\CourseRepository;
use App\Repository\ExamRepository;
use InvalidArgumentException;
use Symfony\Component\Validator\Constraint;
use Symfony\Component\Validator\ConstraintValidator;
use Symfony\Component\Validator\Exception\UnexpectedTypeException;

class NewExamValidator extends ConstraintValidator
{
    public function __construct(
        private readonly CourseRepository $courses,
        private readonly ExamRepository $exams,
    ) {}

    public function validate(mixed $value, Constraint $constraint): void
    {
        if (!$constraint instanceof NewExam) {
            throw new UnexpectedTypeException($constraint, NewExam::class);
        }

        // Only a new reconstruction is ever written; the field constraints report missing or
        // malformed values, so there is nothing to add for those here.
        if (!$value instanceof ExamApi || null !== $value->id) {
            return;
        }

        $period = ExamPeriod::tryFrom((string) $value->period);
        if (null === $period || null === $value->academicYear || null === $value->course?->id) {
            return;
        }

        try {
            $started = $period->hasStarted($value->academicYear);
        } catch (InvalidArgumentException) {
            return;
        }

        if (!$started) {
            $this->context->buildViolation($constraint->notStartedMessage)
                ->atPath('period')
                ->setCode(NewExam::NOT_STARTED)
                ->addViolation();

            return;
        }

        $course = $this->courses->find($value->course->id);
        if (null === $course) {
            return;
        }

        $existing = $this->exams->findOneFor($course, $value->academicYear, $period);
        if (null !== $existing) {
            $this->context->buildViolation($constraint->alreadyExistsMessage)
                ->atPath('period')
                ->setCode(NewExam::ALREADY_EXISTS)
                ->addViolation();
        }

        $source = null === $value->copiedFrom?->id ? null : $this->exams->find($value->copiedFrom->id);
        if (null !== $source && $source->getCourse()->getId() !== $course->getId()) {
            $this->context->buildViolation($constraint->otherCourseMessage)
                ->atPath('copiedFrom')
                ->setCode(NewExam::OTHER_COURSE)
                ->addViolation();
        }
    }
}
