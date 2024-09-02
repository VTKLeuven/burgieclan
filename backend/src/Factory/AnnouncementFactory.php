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
use Zenstruck\Foundry\ModelFactory;
use Zenstruck\Foundry\Proxy;
use Zenstruck\Foundry\RepositoryProxy;

/**
 * @extends ModelFactory<Announcement>
 *
 * @method        Announcement|Proxy               create(array|callable $attributes = [])
 * @method static Announcement|Proxy               createOne(array $attributes = [])
 * @method static Announcement|Proxy               find(object|array|mixed $criteria)
 * @method static Announcement|Proxy               findOrCreate(array $attributes)
 * @method static Announcement|Proxy               first(string $sortedField = 'id')
 * @method static Announcement|Proxy               last(string $sortedField = 'id')
 * @method static Announcement|Proxy               random(array $attributes = [])
 * @method static Announcement|Proxy               randomOrCreate(array $attributes = [])
 * @method static EntityRepository|RepositoryProxy repository()
 * @method static Announcement[]|Proxy[]           all()
 * @method static Announcement[]|Proxy[]           createMany(int $number, array|callable $attributes = [])
 * @method static Announcement[]|Proxy[]           createSequence(iterable|callable $sequence)
 * @method static Announcement[]|Proxy[]           findBy(array $attributes)
 * @method static Announcement[]|Proxy[]           randomRange(int $min, int $max, array $attributes = [])
 * @method static Announcement[]|Proxy[]           randomSet(int $number, array $attributes = [])
 *
 * @phpstan-method        Proxy<Announcement> create(array|callable $attributes = [])
 * @phpstan-method static Proxy<Announcement> createOne(array $attributes = [])
 * @phpstan-method static Proxy<Announcement> find(object|array|mixed $criteria)
 * @phpstan-method static Proxy<Announcement> findOrCreate(array $attributes)
 * @phpstan-method static Proxy<Announcement> first(string $sortedField = 'id')
 * @phpstan-method static Proxy<Announcement> last(string $sortedField = 'id')
 * @phpstan-method static Proxy<Announcement> random(array $attributes = [])
 * @phpstan-method static Proxy<Announcement> randomOrCreate(array $attributes = [])
 * @phpstan-method static RepositoryProxy<Announcement> repository()
 * @phpstan-method static list<Proxy<Announcement>> all()
 * @phpstan-method static list<Proxy<Announcement>> createMany(int $number, array|callable $attributes = [])
 * @phpstan-method static list<Proxy<Announcement>> createSequence(iterable|callable $sequence)
 * @phpstan-method static list<Proxy<Announcement>> findBy(array $attributes)
 * @phpstan-method static list<Proxy<Announcement>> randomRange(int $min, int $max, array $attributes = [])
 * @phpstan-method static list<Proxy<Announcement>> randomSet(int $number, array $attributes = [])
 */
final class AnnouncementFactory extends ModelFactory
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
        $createDate = new DateTimeImmutable();
        $startTime = $createDate->add(new DateInterval('P'. self::faker()->numberBetween(1, 10) . 'D'));
        $endTime = $startTime->add(new DateInterval('P'. self::faker()->numberBetween(1, 10) . 'D'));
        return [
            'title' => self::faker()->word(),
            'content' => self::faker()->text(),
            'startTime' => $startTime,
            'endTime' => $endTime,
            'creator' => UserFactory::randomOrCreate(),
        ];
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#initialization
     */
    protected function initialize(): self
    {
        return $this
            // ->afterInstantiate(function(Announcement $announcement): void {})
        ;
    }

    protected static function getClass(): string
    {
        return Announcement::class;
    }
}
