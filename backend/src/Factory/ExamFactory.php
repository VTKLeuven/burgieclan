<?php

namespace App\Factory;

use App\Constants\AcademicYear;
use App\Constants\ExamPeriod;
use App\Entity\Exam;
use Zenstruck\Foundry\Persistence\PersistentObjectFactory;

/**
 * @extends PersistentObjectFactory<Exam>
 */
final class ExamFactory extends PersistentObjectFactory
{
    public function __construct() {}

    #[\Override]
    public static function class(): string
    {
        return Exam::class;
    }

    /**
     * Last academic year's January exams: long enough ago to have started, whatever today is.
     *
     * @return array<string, mixed>
     */
    #[\Override]
    protected function defaults(): array|callable
    {
        return [
            'creator' => UserFactory::randomOrCreate(),
            'course' => CourseFactory::new(),
            'academicYear' => AcademicYear::format(AcademicYear::currentStartYear() - 1),
            'period' => ExamPeriod::JANUARY,
        ];
    }
}
