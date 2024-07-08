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
use Zenstruck\Foundry\ModelFactory;
use Zenstruck\Foundry\Proxy;
use Zenstruck\Foundry\RepositoryProxy;

/**
 * @extends ModelFactory<Module>
 *
 * @method        Module|Proxy                     create(array|callable $attributes = [])
 * @method static Module|Proxy                     createOne(array $attributes = [])
 * @method static Module|Proxy                     find(object|array|mixed $criteria)
 * @method static Module|Proxy                     findOrCreate(array $attributes)
 * @method static Module|Proxy                     first(string $sortedField = 'id')
 * @method static Module|Proxy                     last(string $sortedField = 'id')
 * @method static Module|Proxy                     random(array $attributes = [])
 * @method static Module|Proxy                     randomOrCreate(array $attributes = [])
 * @method static ModuleRepository|RepositoryProxy repository()
 * @method static Module[]|Proxy[]                 all()
 * @method static Module[]|Proxy[]                 createMany(int $number, array|callable $attributes = [])
 * @method static Module[]|Proxy[]                 createSequence(iterable|callable $sequence)
 * @method static Module[]|Proxy[]                 findBy(array $attributes)
 * @method static Module[]|Proxy[]                 randomRange(int $min, int $max, array $attributes = [])
 * @method static Module[]|Proxy[]                 randomSet(int $number, array $attributes = [])
 *
 * @phpstan-method        Proxy<Module> create(array|callable $attributes = [])
 * @phpstan-method static Proxy<Module> createOne(array $attributes = [])
 * @phpstan-method static Proxy<Module> find(object|array|mixed $criteria)
 * @phpstan-method static Proxy<Module> findOrCreate(array $attributes)
 * @phpstan-method static Proxy<Module> first(string $sortedField = 'id')
 * @phpstan-method static Proxy<Module> last(string $sortedField = 'id')
 * @phpstan-method static Proxy<Module> random(array $attributes = [])
 * @phpstan-method static Proxy<Module> randomOrCreate(array $attributes = [])
 * @phpstan-method static RepositoryProxy<Module> repository()
 * @phpstan-method static list<Proxy<Module>> all()
 * @phpstan-method static list<Proxy<Module>> createMany(int $number, array|callable $attributes = [])
 * @phpstan-method static list<Proxy<Module>> createSequence(iterable|callable $sequence)
 * @phpstan-method static list<Proxy<Module>> findBy(array $attributes)
 * @phpstan-method static list<Proxy<Module>> randomRange(int $min, int $max, array $attributes = [])
 * @phpstan-method static list<Proxy<Module>> randomSet(int $number, array $attributes = [])
 */
final class ModuleFactory extends ModelFactory
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
            'name' => 'Module: ' . self::faker()->word(),
            'program' => ProgramFactory::randomOrCreate(),
        ];
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#initialization
     */
    protected function initialize(): self
    {
        return $this
            // ->afterInstantiate(function(Module $module): void {})
        ;
    }

    protected static function getClass(): string
    {
        return Module::class;
    }
}
