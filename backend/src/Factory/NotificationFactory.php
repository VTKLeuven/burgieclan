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

use App\Entity\Notification;
use DateInterval;
use DateTimeImmutable;
use Doctrine\ORM\EntityRepository;
use Zenstruck\Foundry\ModelFactory;
use Zenstruck\Foundry\Proxy;
use Zenstruck\Foundry\RepositoryProxy;

/**
 * @extends ModelFactory<Notification>
 *
 * @method        Notification|Proxy               create(array|callable $attributes = [])
 * @method static Notification|Proxy               createOne(array $attributes = [])
 * @method static Notification|Proxy               find(object|array|mixed $criteria)
 * @method static Notification|Proxy               findOrCreate(array $attributes)
 * @method static Notification|Proxy               first(string $sortedField = 'id')
 * @method static Notification|Proxy               last(string $sortedField = 'id')
 * @method static Notification|Proxy               random(array $attributes = [])
 * @method static Notification|Proxy               randomOrCreate(array $attributes = [])
 * @method static EntityRepository|RepositoryProxy repository()
 * @method static Notification[]|Proxy[]           all()
 * @method static Notification[]|Proxy[]           createMany(int $number, array|callable $attributes = [])
 * @method static Notification[]|Proxy[]           createSequence(iterable|callable $sequence)
 * @method static Notification[]|Proxy[]           findBy(array $attributes)
 * @method static Notification[]|Proxy[]           randomRange(int $min, int $max, array $attributes = [])
 * @method static Notification[]|Proxy[]           randomSet(int $number, array $attributes = [])
 *
 * @phpstan-method        Proxy<Notification> create(array|callable $attributes = [])
 * @phpstan-method static Proxy<Notification> createOne(array $attributes = [])
 * @phpstan-method static Proxy<Notification> find(object|array|mixed $criteria)
 * @phpstan-method static Proxy<Notification> findOrCreate(array $attributes)
 * @phpstan-method static Proxy<Notification> first(string $sortedField = 'id')
 * @phpstan-method static Proxy<Notification> last(string $sortedField = 'id')
 * @phpstan-method static Proxy<Notification> random(array $attributes = [])
 * @phpstan-method static Proxy<Notification> randomOrCreate(array $attributes = [])
 * @phpstan-method static RepositoryProxy<Notification> repository()
 * @phpstan-method static list<Proxy<Notification>> all()
 * @phpstan-method static list<Proxy<Notification>> createMany(int $number, array|callable $attributes = [])
 * @phpstan-method static list<Proxy<Notification>> createSequence(iterable|callable $sequence)
 * @phpstan-method static list<Proxy<Notification>> findBy(array $attributes)
 * @phpstan-method static list<Proxy<Notification>> randomRange(int $min, int $max, array $attributes = [])
 * @phpstan-method static list<Proxy<Notification>> randomSet(int $number, array $attributes = [])
 */
final class NotificationFactory extends ModelFactory
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
            // ->afterInstantiate(function(Notification $notification): void {})
        ;
    }

    protected static function getClass(): string
    {
        return Notification::class;
    }
}
