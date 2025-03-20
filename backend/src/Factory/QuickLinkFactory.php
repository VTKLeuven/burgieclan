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

use App\Entity\QuickLink;
use App\Repository\QuickLinkRepository;
use Zenstruck\Foundry\ModelFactory;
use Zenstruck\Foundry\Proxy;
use Zenstruck\Foundry\RepositoryProxy;

/**
 * @extends ModelFactory<QuickLink>
 *
 * @method        QuickLink|Proxy                     create(array|callable $attributes = [])
 * @method static QuickLink|Proxy                     createOne(array $attributes = [])
 * @method static QuickLink|Proxy                     find(object|array|mixed $criteria)
 * @method static QuickLink|Proxy                     findOrCreate(array $attributes)
 * @method static QuickLink|Proxy                     first(string $sortedField = 'id')
 * @method static QuickLink|Proxy                     last(string $sortedField = 'id')
 * @method static QuickLink|Proxy                     random(array $attributes = [])
 * @method static QuickLink|Proxy                     randomOrCreate(array $attributes = [])
 * @method static QuickLinkRepository|RepositoryProxy repository()
 * @method static QuickLink[]|Proxy[]                 all()
 * @method static QuickLink[]|Proxy[]                 createMany(int $number, array|callable $attributes = [])
 * @method static QuickLink[]|Proxy[]                 createSequence(iterable|callable $sequence)
 * @method static QuickLink[]|Proxy[]                 findBy(array $attributes)
 * @method static QuickLink[]|Proxy[]                 randomRange(int $min, int $max, array $attributes = [])
 * @method static QuickLink[]|Proxy[]                 randomSet(int $number, array $attributes = [])
 *
 * @phpstan-method        Proxy<QuickLink> create(array|callable $attributes = [])
 * @phpstan-method static Proxy<QuickLink> createOne(array $attributes = [])
 * @phpstan-method static Proxy<QuickLink> find(object|array|mixed $criteria)
 * @phpstan-method static Proxy<QuickLink> findOrCreate(array $attributes)
 * @phpstan-method static Proxy<QuickLink> first(string $sortedField = 'id')
 * @phpstan-method static Proxy<QuickLink> last(string $sortedField = 'id')
 * @phpstan-method static Proxy<QuickLink> random(array $attributes = [])
 * @phpstan-method static Proxy<QuickLink> randomOrCreate(array $attributes = [])
 * @phpstan-method static RepositoryProxy<QuickLink> repository()
 * @phpstan-method static list<Proxy<QuickLink>> all()
 * @phpstan-method static list<Proxy<QuickLink>> createMany(int $number, array|callable $attributes = [])
 * @phpstan-method static list<Proxy<QuickLink>> createSequence(iterable|callable $sequence)
 * @phpstan-method static list<Proxy<QuickLink>> findBy(array $attributes)
 * @phpstan-method static list<Proxy<QuickLink>> randomRange(int $min, int $max, array $attributes = [])
 * @phpstan-method static list<Proxy<QuickLink>> randomSet(int $number, array $attributes = [])
 */
final class QuickLinkFactory extends ModelFactory
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
            'name' => self::faker()->words(self::faker()->numberBetween(0, 4), true),
            'linkTo' => self::faker()->text(255),
        ];
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#initialization
     */
    protected function initialize(): self
    {
        return $this
            // ->afterInstantiate(function(QuickLink $quickLink): void {})
        ;
    }

    protected static function getClass(): string
    {
        return QuickLink::class;
    }
}
