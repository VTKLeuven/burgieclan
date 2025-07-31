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

use App\Entity\Module;
use App\Repository\ModuleRepository;
use Doctrine\ORM\EntityRepository;
use Zenstruck\Foundry\Persistence\PersistentProxyObjectFactory;
use Zenstruck\Foundry\Persistence\Proxy;
use Zenstruck\Foundry\Persistence\ProxyRepositoryDecorator;

/**
 * @extends PersistentProxyObjectFactory<Module>
 *
 * @method        Module|Proxy                              create(array|callable $attributes = [])
 * @method static Module|Proxy                              createOne(array $attributes = [])
 * @method static Module|Proxy                              find(object|array|mixed $criteria)
 * @method static Module|Proxy                              findOrCreate(array $attributes)
 * @method static Module|Proxy                              first(string $sortedField = 'id')
 * @method static Module|Proxy                              last(string $sortedField = 'id')
 * @method static Module|Proxy                              random(array $attributes = [])
 * @method static Module|Proxy                              randomOrCreate(array $attributes = [])
 * @method static ModuleRepository|ProxyRepositoryDecorator repository()
 * @method static Module[]|Proxy[]                          all()
 * @method static Module[]|Proxy[]                          createMany(int $number, array|callable $attributes = [])
 * @method static Module[]|Proxy[]                          createSequence(iterable|callable $sequence)
 * @method static Module[]|Proxy[]                          findBy(array $attributes)
 * @method static Module[]|Proxy[]                          randomRange(int $min, int $max, array $attributes = [])
 * @method static Module[]|Proxy[]                          randomSet(int $number, array $attributes = [])
 *
 * @phpstan-method        Module&Proxy<Module> create(array|callable $attributes = [])
 * @phpstan-method static Module&Proxy<Module> createOne(array $attributes = [])
 * @phpstan-method static Module&Proxy<Module> find(object|array|mixed $criteria)
 * @phpstan-method static Module&Proxy<Module> findOrCreate(array $attributes)
 * @phpstan-method static Module&Proxy<Module> first(string $sortedField = 'id')
 * @phpstan-method static Module&Proxy<Module> last(string $sortedField = 'id')
 * @phpstan-method static Module&Proxy<Module> random(array $attributes = [])
 * @phpstan-method static Module&Proxy<Module> randomOrCreate(array $attributes = [])
 * @phpstan-method static ProxyRepositoryDecorator<Module, EntityRepository> repository()
 * @phpstan-method static list<Module&Proxy<Module>> all()
 * @phpstan-method static list<Module&Proxy<Module>> createMany(int $number, array|callable $attributes = [])
 * @phpstan-method static list<Module&Proxy<Module>> createSequence(iterable|callable $sequence)
 * @phpstan-method static list<Module&Proxy<Module>> findBy(array $attributes)
 * @phpstan-method static list<Module&Proxy<Module>> randomRange(int $min, int $max, array $attributes = [])
 * @phpstan-method static list<Module&Proxy<Module>> randomSet(int $number, array $attributes = [])
 */
final class ModuleFactory extends PersistentProxyObjectFactory
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
        return Module::class;
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#model-factories
     */
    protected function defaults(): array|callable
    {
        return [
            'name' => 'Module: ' . self::faker()->word(),
            'program' => ProgramFactory::randomOrCreate(),
        ];
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#initialization
     */
    protected function initialize(): static
    {
        return $this
            // ->afterInstantiate(function(Module $module): void {})
        ;
    }
}
