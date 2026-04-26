<?php

namespace App\Factory;

use App\Entity\CourseComment;
use Zenstruck\Foundry\Persistence\PersistentObjectFactory;

/**
 * @extends PersistentObjectFactory<CourseComment>
 */
final class CourseCommentFactory extends PersistentObjectFactory
{
    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#factories-as-services
     */
    public function __construct() {}

    #[\Override]
    public static function class(): string
    {
        return CourseComment::class;
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#model-factories
     */
    #[\Override]
    protected function defaults(): array|callable
    {
        return [
            'anonymous' => self::faker()->boolean(),
            'category' => CommentCategoryFactory::randomOrCreate(),
            'content' => self::faker()->text(),
            'course' => CourseFactory::randomOrCreate(),
            'creator' => UserFactory::randomOrCreate(),
        ];
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#initialization
     */
    #[\Override]
    protected function initialize(): static
    {
        return $this
            // ->afterInstantiate(function(CourseComment $courseComment): void {})
        ;
    }
}
