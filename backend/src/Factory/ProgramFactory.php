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

use App\Entity\Program;
use App\Repository\ProgramRepository;
use Doctrine\ORM\EntityRepository;
use Zenstruck\Foundry\Persistence\PersistentProxyObjectFactory;
use Zenstruck\Foundry\Persistence\Proxy;
use Zenstruck\Foundry\Persistence\ProxyRepositoryDecorator;

/**
 * @extends PersistentProxyObjectFactory<Program>
 *
 * @method        Program|Proxy                              create(array|callable $attributes = [])
 * @method static Program|Proxy                              createOne(array $attributes = [])
 * @method static Program|Proxy                              find(object|array|mixed $criteria)
 * @method static Program|Proxy                              findOrCreate(array $attributes)
 * @method static Program|Proxy                              first(string $sortedField = 'id')
 * @method static Program|Proxy                              last(string $sortedField = 'id')
 * @method static Program|Proxy                              random(array $attributes = [])
 * @method static Program|Proxy                              randomOrCreate(array $attributes = [])
 * @method static ProgramRepository|ProxyRepositoryDecorator repository()
 * @method static Program[]|Proxy[]                          all()
 * @method static Program[]|Proxy[]                          createMany(int $number, array|callable $attributes = [])
 * @method static Program[]|Proxy[]                          createSequence(iterable|callable $sequence)
 * @method static Program[]|Proxy[]                          findBy(array $attributes)
 * @method static Program[]|Proxy[]                          randomRange(int $min, int $max, array $attributes = [])
 * @method static Program[]|Proxy[]                          randomSet(int $number, array $attributes = [])
 *
 * @phpstan-method        Program&Proxy<Program> create(array|callable $attributes = [])
 * @phpstan-method static Program&Proxy<Program> createOne(array $attributes = [])
 * @phpstan-method static Program&Proxy<Program> find(object|array|mixed $criteria)
 * @phpstan-method static Program&Proxy<Program> findOrCreate(array $attributes)
 * @phpstan-method static Program&Proxy<Program> first(string $sortedField = 'id')
 * @phpstan-method static Program&Proxy<Program> last(string $sortedField = 'id')
 * @phpstan-method static Program&Proxy<Program> random(array $attributes = [])
 * @phpstan-method static Program&Proxy<Program> randomOrCreate(array $attributes = [])
 * @phpstan-method static ProxyRepositoryDecorator<Program, EntityRepository> repository()
 * @phpstan-method static list<Program&Proxy<Program>> all()
 * @phpstan-method static list<Program&Proxy<Program>> createMany(int $number, array|callable $attributes = [])
 * @phpstan-method static list<Program&Proxy<Program>> createSequence(iterable|callable $sequence)
 * @phpstan-method static list<Program&Proxy<Program>> findBy(array $attributes)
 * @phpstan-method static list<Program&Proxy<Program>> randomRange(int $min, int $max, array $attributes = [])
 * @phpstan-method static list<Program&Proxy<Program>> randomSet(int $number, array $attributes = [])
 */
final class ProgramFactory extends PersistentProxyObjectFactory
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
        return Program::class;
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#model-factories
     */
    protected function defaults(): array
    {
        return [
            'name' => 'Master in de ingenieurswetenschappen: ' . self::faker()->word(),
        ];
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#initialization
     */
    protected function initialize(): static
    {
        return $this
            // ->afterInstantiate(function(Program $program): void {})
        ;
    }
}
