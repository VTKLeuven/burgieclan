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
use Doctrine\ORM\EntityRepository;
use Zenstruck\Foundry\Persistence\PersistentProxyObjectFactory;
use Zenstruck\Foundry\Persistence\Proxy;
use Zenstruck\Foundry\Persistence\ProxyRepositoryDecorator;

/**
 * @extends PersistentProxyObjectFactory<CourseComment>
 *
 * @method        CourseComment|Proxy                              create(array|callable $attributes = [])
 * @method static CourseComment|Proxy                              createOne(array $attributes = [])
 * @method static CourseComment|Proxy                              find(object|array|mixed $criteria)
 * @method static CourseComment|Proxy                              findOrCreate(array $attributes)
 * @method static CourseComment|Proxy                              first(string $sortedField = 'id')
 * @method static CourseComment|Proxy                              last(string $sortedField = 'id')
 * @method static CourseComment|Proxy                              random(array $attributes = [])
 * @method static CourseComment|Proxy                              randomOrCreate(array $attributes = [])
 * @method static CourseCommentRepository|ProxyRepositoryDecorator repository()
 * @method static CourseComment[]|Proxy[]                          all()
 * @method static CourseComment[]|Proxy[]                          createMany(int $number, array|callable $attributes = [])
 * @method static CourseComment[]|Proxy[]                          createSequence(iterable|callable $sequence)
 * @method static CourseComment[]|Proxy[]                          findBy(array $attributes)
 * @method static CourseComment[]|Proxy[]                          randomRange(int $min, int $max, array $attributes = [])
 * @method static CourseComment[]|Proxy[]                          randomSet(int $number, array $attributes = [])
 *
 * @phpstan-method        CourseComment&Proxy<CourseComment> create(array|callable $attributes = [])
 * @phpstan-method static CourseComment&Proxy<CourseComment> createOne(array $attributes = [])
 * @phpstan-method static CourseComment&Proxy<CourseComment> find(object|array|mixed $criteria)
 * @phpstan-method static CourseComment&Proxy<CourseComment> findOrCreate(array $attributes)
 * @phpstan-method static CourseComment&Proxy<CourseComment> first(string $sortedField = 'id')
 * @phpstan-method static CourseComment&Proxy<CourseComment> last(string $sortedField = 'id')
 * @phpstan-method static CourseComment&Proxy<CourseComment> random(array $attributes = [])
 * @phpstan-method static CourseComment&Proxy<CourseComment> randomOrCreate(array $attributes = [])
 * @phpstan-method static ProxyRepositoryDecorator<CourseComment, EntityRepository> repository()
 * @phpstan-method static list<CourseComment&Proxy<CourseComment>> all()
 * @phpstan-method static list<CourseComment&Proxy<CourseComment>> createMany(int $number, array|callable $attributes = [])
 * @phpstan-method static list<CourseComment&Proxy<CourseComment>> createSequence(iterable|callable $sequence)
 * @phpstan-method static list<CourseComment&Proxy<CourseComment>> findBy(array $attributes)
 * @phpstan-method static list<CourseComment&Proxy<CourseComment>> randomRange(int $min, int $max, array $attributes = [])
 * @phpstan-method static list<CourseComment&Proxy<CourseComment>> randomSet(int $number, array $attributes = [])
 */
final class CourseCommentFactory extends PersistentProxyObjectFactory
{
    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#factories-as-services
     */
    public function __construct()
    {
        parent::__construct();
    }

    public static function class(): string
    {
        return CourseComment::class;
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#model-factories
     */
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
    protected function initialize(): static
    {
        return $this
            // ->afterInstantiate(function(CourseComment $courseComment): void {})
        ;
    }
}
