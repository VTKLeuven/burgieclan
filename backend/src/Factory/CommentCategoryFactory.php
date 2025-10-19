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
use Doctrine\ORM\EntityRepository;
use Zenstruck\Foundry\Persistence\PersistentProxyObjectFactory;
use Zenstruck\Foundry\Persistence\Proxy;
use Zenstruck\Foundry\Persistence\ProxyRepositoryDecorator;

/**
 * @extends PersistentProxyObjectFactory<CommentCategory>
 *
 * @method        CommentCategory|Proxy                              create(array|callable $attributes = [])
 * @method static CommentCategory|Proxy                              createOne(array $attributes = [])
 * @method static CommentCategory|Proxy                              find(object|array|mixed $criteria)
 * @method static CommentCategory|Proxy                              findOrCreate(array $attributes)
 * @method static CommentCategory|Proxy                              first(string $sortedField = 'id')
 * @method static CommentCategory|Proxy                              last(string $sortedField = 'id')
 * @method static CommentCategory|Proxy                              random(array $attributes = [])
 * @method static CommentCategory|Proxy                              randomOrCreate(array $attributes = [])
 * @method static CommentCategoryRepository|ProxyRepositoryDecorator repository()
 * @method static CommentCategory[]|Proxy[]                          all()
 * @method static CommentCategory[]|Proxy[]                          createMany(int $number, array|callable $attributes = [])
 * @method static CommentCategory[]|Proxy[]                          createSequence(iterable|callable $sequence)
 * @method static CommentCategory[]|Proxy[]                          findBy(array $attributes)
 * @method static CommentCategory[]|Proxy[]                          randomRange(int $min, int $max, array $attributes = [])
 * @method static CommentCategory[]|Proxy[]                          randomSet(int $number, array $attributes = [])
 *
 * @phpstan-method        CommentCategory&Proxy<CommentCategory> create(array|callable $attributes = [])
 * @phpstan-method static CommentCategory&Proxy<CommentCategory> createOne(array $attributes = [])
 * @phpstan-method static CommentCategory&Proxy<CommentCategory> find(object|array|mixed $criteria)
 * @phpstan-method static CommentCategory&Proxy<CommentCategory> findOrCreate(array $attributes)
 * @phpstan-method static CommentCategory&Proxy<CommentCategory> first(string $sortedField = 'id')
 * @phpstan-method static CommentCategory&Proxy<CommentCategory> last(string $sortedField = 'id')
 * @phpstan-method static CommentCategory&Proxy<CommentCategory> random(array $attributes = [])
 * @phpstan-method static CommentCategory&Proxy<CommentCategory> randomOrCreate(array $attributes = [])
 * @phpstan-method static ProxyRepositoryDecorator<CommentCategory, EntityRepository> repository()
 * @phpstan-method static list<CommentCategory&Proxy<CommentCategory>> all()
 * @phpstan-method static list<CommentCategory&Proxy<CommentCategory>> createMany(int $number, array|callable $attributes = [])
 * @phpstan-method static list<CommentCategory&Proxy<CommentCategory>> createSequence(iterable|callable $sequence)
 * @phpstan-method static list<CommentCategory&Proxy<CommentCategory>> findBy(array $attributes)
 * @phpstan-method static list<CommentCategory&Proxy<CommentCategory>> randomRange(int $min, int $max, array $attributes = [])
 * @phpstan-method static list<CommentCategory&Proxy<CommentCategory>> randomSet(int $number, array $attributes = [])
 */
final class CommentCategoryFactory extends PersistentProxyObjectFactory
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
        return CommentCategory::class;
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#model-factories
     */
    protected function defaults(): array
    {
        return [
            'name_nl' => self::faker()->word(),
            'description_nl' => self::faker()->paragraph(),
            'name_en' => '(en)' . self::faker()->word(),
            'description_en' => '(en)' . self::faker()->paragraph(),
        ];
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#initialization
     */
    protected function initialize(): static
    {
        return $this
            // ->afterInstantiate(function(CommentCategory $commentCategory): void {})
        ;
    }
}
