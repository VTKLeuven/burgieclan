<?php

namespace App\Factory;

use App\Constants\AcademicYear;
use App\Entity\CourseRating;
use Zenstruck\Foundry\Persistence\PersistentObjectFactory;

/**
 * @extends PersistentObjectFactory<CourseRating>
 */
final class CourseRatingFactory extends PersistentObjectFactory
{
    public function __construct() {}

    #[\Override]
    public static function class(): string
    {
        return CourseRating::class;
    }

    /**
     * @return array<string, mixed>
     */
    #[\Override]
    protected function defaults(): array|callable
    {
        return [
            'course' => CourseFactory::randomOrCreate(),
            'category' => CommentCategoryFactory::randomOrCreate(),
            'creator' => UserFactory::randomOrCreate(),
            'value' => self::faker()->numberBetween(CourseRating::MIN, CourseRating::MAX),
            'academicYear' => AcademicYear::current(),
        ];
    }
}
