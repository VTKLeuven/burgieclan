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

use App\Entity\CourseCommentVote;
use App\Repository\CourseCommentVoteRepository;
use Zenstruck\Foundry\ModelFactory;
use Zenstruck\Foundry\Proxy;
use Zenstruck\Foundry\RepositoryProxy;

/**
 * @extends ModelFactory<CourseCommentVote>
 *
 * @method        CourseCommentVote|Proxy                     create(array|callable $attributes = [])
 * @method static CourseCommentVote|Proxy                     createOne(array $attributes = [])
 * @method static CourseCommentVote|Proxy                     find(object|array|mixed $criteria)
 * @method static CourseCommentVote|Proxy                     findOrCreate(array $attributes)
 * @method static CourseCommentVote|Proxy                     first(string $sortedField = 'id')
 * @method static CourseCommentVote|Proxy                     last(string $sortedField = 'id')
 * @method static CourseCommentVote|Proxy                     random(array $attributes = [])
 * @method static CourseCommentVote|Proxy                     randomOrCreate(array $attributes = [])
 * @method static CourseCommentVoteRepository|RepositoryProxy repository()
 * @method static CourseCommentVote[]|Proxy[]                 all()
 * @method static CourseCommentVote[]|Proxy[]                 createMany(int $number, array|callable $attributes = [])
 * @method static CourseCommentVote[]|Proxy[]                 createSequence(iterable|callable $sequence)
 * @method static CourseCommentVote[]|Proxy[]                 findBy(array $attributes)
 * @method static CourseCommentVote[]|Proxy[]                 randomRange(int $min, int $max, array $attributes = [])
 * @method static CourseCommentVote[]|Proxy[]                 randomSet(int $number, array $attributes = [])
 *
 * @phpstan-method        Proxy<CourseCommentVote> create(array|callable $attributes = [])
 * @phpstan-method static Proxy<CourseCommentVote> createOne(array $attributes = [])
 * @phpstan-method static Proxy<CourseCommentVote> find(object|array|mixed $criteria)
 * @phpstan-method static Proxy<CourseCommentVote> findOrCreate(array $attributes)
 * @phpstan-method static Proxy<CourseCommentVote> first(string $sortedField = 'id')
 * @phpstan-method static Proxy<CourseCommentVote> last(string $sortedField = 'id')
 * @phpstan-method static Proxy<CourseCommentVote> random(array $attributes = [])
 * @phpstan-method static Proxy<CourseCommentVote> randomOrCreate(array $attributes = [])
 * @phpstan-method static RepositoryProxy<CourseCommentVote> repository()
 * @phpstan-method static list<Proxy<CourseCommentVote>> all()
 * @phpstan-method static list<Proxy<CourseCommentVote>> createMany(int $number, array|callable $attributes = [])
 * @phpstan-method static list<Proxy<CourseCommentVote>> createSequence(iterable|callable $sequence)
 * @phpstan-method static list<Proxy<CourseCommentVote>> findBy(array $attributes)
 * @phpstan-method static list<Proxy<CourseCommentVote>> randomRange(int $min, int $max, array $attributes = [])
 * @phpstan-method static list<Proxy<CourseCommentVote>> randomSet(int $number, array $attributes = [])
 */
final class CourseCommentVoteFactory extends ModelFactory
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
            'isUpvote' => self::faker()->boolean(),
            'comment' => CourseCommentFactory::randomOrCreate(),
            'creator' => UserFactory::randomOrCreate(),
        ];
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#initialization
     */
    protected function initialize(): self
    {
        return $this
            // ->afterInstantiate(function(CourseCommentVote $courseCommentVote): void {})
            ;
    }

    protected static function getClass(): string
    {
        return CourseCommentVote::class;
    }
}
