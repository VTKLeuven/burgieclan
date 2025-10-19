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

use App\Entity\Announcement;
use DateInterval;
use DateTimeImmutable;
use Doctrine\ORM\EntityRepository;
use Zenstruck\Foundry\Persistence\PersistentProxyObjectFactory;
use Zenstruck\Foundry\Persistence\Proxy;
use Zenstruck\Foundry\Persistence\ProxyRepositoryDecorator;

/**
 * @extends PersistentProxyObjectFactory<Announcement>
 *
 * @method        Announcement|Proxy                        create(array|callable $attributes = [])
 * @method static Announcement|Proxy                        createOne(array $attributes = [])
 * @method static Announcement|Proxy                        find(object|array|mixed $criteria)
 * @method static Announcement|Proxy                        findOrCreate(array $attributes)
 * @method static Announcement|Proxy                        first(string $sortedField = 'id')
 * @method static Announcement|Proxy                        last(string $sortedField = 'id')
 * @method static Announcement|Proxy                        random(array $attributes = [])
 * @method static Announcement|Proxy                        randomOrCreate(array $attributes = [])
 * @method static EntityRepository|ProxyRepositoryDecorator repository()
 * @method static Announcement[]|Proxy[]                    all()
 * @method static Announcement[]|Proxy[]                    createMany(int $number, array|callable $attributes = [])
 * @method static Announcement[]|Proxy[]                    createSequence(iterable|callable $sequence)
 * @method static Announcement[]|Proxy[]                    findBy(array $attributes)
 * @method static Announcement[]|Proxy[]                    randomRange(int $min, int $max, array $attributes = [])
 * @method static Announcement[]|Proxy[]                    randomSet(int $number, array $attributes = [])
 *
 * @phpstan-method        Announcement&Proxy<Announcement> create(array|callable $attributes = [])
 * @phpstan-method static Announcement&Proxy<Announcement> createOne(array $attributes = [])
 * @phpstan-method static Announcement&Proxy<Announcement> find(object|array|mixed $criteria)
 * @phpstan-method static Announcement&Proxy<Announcement> findOrCreate(array $attributes)
 * @phpstan-method static Announcement&Proxy<Announcement> first(string $sortedField = 'id')
 * @phpstan-method static Announcement&Proxy<Announcement> last(string $sortedField = 'id')
 * @phpstan-method static Announcement&Proxy<Announcement> random(array $attributes = [])
 * @phpstan-method static Announcement&Proxy<Announcement> randomOrCreate(array $attributes = [])
 * @phpstan-method static ProxyRepositoryDecorator<Announcement, EntityRepository> repository()
 * @phpstan-method static list<Announcement&Proxy<Announcement>> all()
 * @phpstan-method static list<Announcement&Proxy<Announcement>> createMany(int $number, array|callable $attributes = [])
 * @phpstan-method static list<Announcement&Proxy<Announcement>> createSequence(iterable|callable $sequence)
 * @phpstan-method static list<Announcement&Proxy<Announcement>> findBy(array $attributes)
 * @phpstan-method static list<Announcement&Proxy<Announcement>> randomRange(int $min, int $max, array $attributes = [])
 * @phpstan-method static list<Announcement&Proxy<Announcement>> randomSet(int $number, array $attributes = [])
 */
final class AnnouncementFactory extends PersistentProxyObjectFactory
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
        return Announcement::class;
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#model-factories
     */
    protected function defaults(): array
    {
        $createDate = new DateTimeImmutable();
        $startTime = $createDate->add(new DateInterval('P'. self::faker()->numberBetween(1, 10) . 'D'));
        $endTime = $startTime->add(new DateInterval('P'. self::faker()->numberBetween(1, 10) . 'D'));
        return [
            'title_nl' => self::faker()->word(),
            'title_en' => self::faker()->word(),
            'content_nl' => self::faker()->text(),
            'content_en' => self::faker()->text(),
            'startTime' => $startTime,
            'endTime' => $endTime,
            'priority' => self::faker()->boolean(),
            'creator' => UserFactory::randomOrCreate(),
        ];
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#initialization
     */
    protected function initialize(): static
    {
        return $this
            // ->afterInstantiate(function(Announcement $announcement): void {})
        ;
    }
}
