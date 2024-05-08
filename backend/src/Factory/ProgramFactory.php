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
use Zenstruck\Foundry\ModelFactory;
use Zenstruck\Foundry\Proxy;
use Zenstruck\Foundry\RepositoryProxy;

/**
 * @extends ModelFactory<Program>
 *
 * @method        Program|Proxy                     create(array|callable $attributes = [])
 * @method static Program|Proxy                     createOne(array $attributes = [])
 * @method static Program|Proxy                     find(object|array|mixed $criteria)
 * @method static Program|Proxy                     findOrCreate(array $attributes)
 * @method static Program|Proxy                     first(string $sortedField = 'id')
 * @method static Program|Proxy                     last(string $sortedField = 'id')
 * @method static Program|Proxy                     random(array $attributes = [])
 * @method static Program|Proxy                     randomOrCreate(array $attributes = [])
 * @method static ProgramRepository|RepositoryProxy repository()
 * @method static Program[]|Proxy[]                 all()
 * @method static Program[]|Proxy[]                 createMany(int $number, array|callable $attributes = [])
 * @method static Program[]|Proxy[]                 createSequence(iterable|callable $sequence)
 * @method static Program[]|Proxy[]                 findBy(array $attributes)
 * @method static Program[]|Proxy[]                 randomRange(int $min, int $max, array $attributes = [])
 * @method static Program[]|Proxy[]                 randomSet(int $number, array $attributes = [])
 *
 * @phpstan-method        Proxy<Program> create(array|callable $attributes = [])
 * @phpstan-method static Proxy<Program> createOne(array $attributes = [])
 * @phpstan-method static Proxy<Program> find(object|array|mixed $criteria)
 * @phpstan-method static Proxy<Program> findOrCreate(array $attributes)
 * @phpstan-method static Proxy<Program> first(string $sortedField = 'id')
 * @phpstan-method static Proxy<Program> last(string $sortedField = 'id')
 * @phpstan-method static Proxy<Program> random(array $attributes = [])
 * @phpstan-method static Proxy<Program> randomOrCreate(array $attributes = [])
 * @phpstan-method static RepositoryProxy<Program> repository()
 * @phpstan-method static list<Proxy<Program>> all()
 * @phpstan-method static list<Proxy<Program>> createMany(int $number, array|callable $attributes = [])
 * @phpstan-method static list<Proxy<Program>> createSequence(iterable|callable $sequence)
 * @phpstan-method static list<Proxy<Program>> findBy(array $attributes)
 * @phpstan-method static list<Proxy<Program>> randomRange(int $min, int $max, array $attributes = [])
 * @phpstan-method static list<Proxy<Program>> randomSet(int $number, array $attributes = [])
 */
final class ProgramFactory extends ModelFactory
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
            'name' => 'Master in de ingenieurswetenschappen: ' . self::faker()->word(),
        ];
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#initialization
     */
    protected function initialize(): self
    {
        return $this
            // ->afterInstantiate(function(Program $program): void {})
        ;
    }

    protected static function getClass(): string
    {
        return Program::class;
    }
}
