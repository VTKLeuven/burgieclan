<?php

/*
 * This file is part of the Symfony package.
 *
 * (c) Fabien Potencier <fabien@symfony.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace App\Factory;

use App\Entity\CourseComment;
use App\Repository\CourseCommentRepository;
use Zenstruck\Foundry\ModelFactory;
use Zenstruck\Foundry\Proxy;
use Zenstruck\Foundry\RepositoryProxy;

/**
 * @extends ModelFactory<CourseComment>
 *
 * @method        CourseComment|Proxy                     create(array|callable $attributes = [])
 * @method static CourseComment|Proxy                     createOne(array $attributes = [])
 * @method static CourseComment|Proxy                     find(object|array|mixed $criteria)
 * @method static CourseComment|Proxy                     findOrCreate(array $attributes)
 * @method static CourseComment|Proxy                     first(string $sortedField = 'id')
 * @method static CourseComment|Proxy                     last(string $sortedField = 'id')
 * @method static CourseComment|Proxy                     random(array $attributes = [])
 * @method static CourseComment|Proxy                     randomOrCreate(array $attributes = [])
 * @method static CourseCommentRepository|RepositoryProxy repository()
 * @method static CourseComment[]|Proxy[]                 all()
 * @method static CourseComment[]|Proxy[]                 createMany(int $number, array|callable $attributes = [])
 * @method static CourseComment[]|Proxy[]                 createSequence(iterable|callable $sequence)
 * @method static CourseComment[]|Proxy[]                 findBy(array $attributes)
 * @method static CourseComment[]|Proxy[]                 randomRange(int $min, int $max, array $attributes = [])
 * @method static CourseComment[]|Proxy[]                 randomSet(int $number, array $attributes = [])
 *
 * @phpstan-method        Proxy<CourseComment> create(array|callable $attributes = [])
 * @phpstan-method static Proxy<CourseComment> createOne(array $attributes = [])
 * @phpstan-method static Proxy<CourseComment> find(object|array|mixed $criteria)
 * @phpstan-method static Proxy<CourseComment> findOrCreate(array $attributes)
 * @phpstan-method static Proxy<CourseComment> first(string $sortedField = 'id')
 * @phpstan-method static Proxy<CourseComment> last(string $sortedField = 'id')
 * @phpstan-method static Proxy<CourseComment> random(array $attributes = [])
 * @phpstan-method static Proxy<CourseComment> randomOrCreate(array $attributes = [])
 * @phpstan-method static RepositoryProxy<CourseComment> repository()
 * @phpstan-method static list<Proxy<CourseComment>> all()
 * @phpstan-method static list<Proxy<CourseComment>> createMany(int $number, array|callable $attributes = [])
 * @phpstan-method static list<Proxy<CourseComment>> createSequence(iterable|callable $sequence)
 * @phpstan-method static list<Proxy<CourseComment>> findBy(array $attributes)
 * @phpstan-method static list<Proxy<CourseComment>> randomRange(int $min, int $max, array $attributes = [])
 * @phpstan-method static list<Proxy<CourseComment>> randomSet(int $number, array $attributes = [])
 */
final class CourseCommentFactory extends ModelFactory
{
    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#factories-as-services
     */
    public function __construct()
    {
        parent::__construct();
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#model-factories
     */
    protected function getDefaults(): array
    {
        return [
            'anonymous' => self::faker()->boolean(),
            'category' => CommentCategoryFactory::randomOrCreate(),
            'content' => self::faker()->text(),
            'course' => CourseFactory::randomOrCreate(),
            'user' => UserFactory::randomOrCreate(),
        ];
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#initialization
     */
    protected function initialize(): self
    {
        return $this
            // ->afterInstantiate(function(CourseComment $courseComment): void {})
        ;
    }

    protected static function getClass(): string
    {
        return CourseComment::class;
    }
}
