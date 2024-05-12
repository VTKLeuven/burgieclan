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

use App\Entity\CommentCategory;
use App\Repository\CommentCategoryRepository;
use Zenstruck\Foundry\ModelFactory;
use Zenstruck\Foundry\Proxy;
use Zenstruck\Foundry\RepositoryProxy;

/**
 * @extends ModelFactory<CommentCategory>
 *
 * @method        CommentCategory|Proxy                     create(array|callable $attributes = [])
 * @method static CommentCategory|Proxy                     createOne(array $attributes = [])
 * @method static CommentCategory|Proxy                     find(object|array|mixed $criteria)
 * @method static CommentCategory|Proxy                     findOrCreate(array $attributes)
 * @method static CommentCategory|Proxy                     first(string $sortedField = 'id')
 * @method static CommentCategory|Proxy                     last(string $sortedField = 'id')
 * @method static CommentCategory|Proxy                     random(array $attributes = [])
 * @method static CommentCategory|Proxy                     randomOrCreate(array $attributes = [])
 * @method static CommentCategoryRepository|RepositoryProxy repository()
 * @method static CommentCategory[]|Proxy[]                 all()
 * @method static CommentCategory[]|Proxy[]                 createMany(int $number, array|callable $attributes = [])
 * @method static CommentCategory[]|Proxy[]                 createSequence(iterable|callable $sequence)
 * @method static CommentCategory[]|Proxy[]                 findBy(array $attributes)
 * @method static CommentCategory[]|Proxy[]                 randomRange(int $min, int $max, array $attributes = [])
 * @method static CommentCategory[]|Proxy[]                 randomSet(int $number, array $attributes = [])
 *
 * @phpstan-method        Proxy<CommentCategory> create(array|callable $attributes = [])
 * @phpstan-method static Proxy<CommentCategory> createOne(array $attributes = [])
 * @phpstan-method static Proxy<CommentCategory> find(object|array|mixed $criteria)
 * @phpstan-method static Proxy<CommentCategory> findOrCreate(array $attributes)
 * @phpstan-method static Proxy<CommentCategory> first(string $sortedField = 'id')
 * @phpstan-method static Proxy<CommentCategory> last(string $sortedField = 'id')
 * @phpstan-method static Proxy<CommentCategory> random(array $attributes = [])
 * @phpstan-method static Proxy<CommentCategory> randomOrCreate(array $attributes = [])
 * @phpstan-method static RepositoryProxy<CommentCategory> repository()
 * @phpstan-method static list<Proxy<CommentCategory>> all()
 * @phpstan-method static list<Proxy<CommentCategory>> createMany(int $number, array|callable $attributes = [])
 * @phpstan-method static list<Proxy<CommentCategory>> createSequence(iterable|callable $sequence)
 * @phpstan-method static list<Proxy<CommentCategory>> findBy(array $attributes)
 * @phpstan-method static list<Proxy<CommentCategory>> randomRange(int $min, int $max, array $attributes = [])
 * @phpstan-method static list<Proxy<CommentCategory>> randomSet(int $number, array $attributes = [])
 */
final class CommentCategoryFactory extends ModelFactory
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
            'name' => self::faker()->word(),
            'description' => self::faker()->paragraph(),
        ];
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#initialization
     */
    protected function initialize(): self
    {
        return $this
            // ->afterInstantiate(function(CommentCategory $commentCategory): void {})
        ;
    }

    protected static function getClass(): string
    {
        return CommentCategory::class;
    }
}
