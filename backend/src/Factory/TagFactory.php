<?php

namespace App\Factory;

use App\Entity\Tag;
use App\Repository\TagRepository;
use Doctrine\ORM\EntityRepository;
use Zenstruck\Foundry\Persistence\PersistentProxyObjectFactory;
use Zenstruck\Foundry\Persistence\Proxy;
use Zenstruck\Foundry\Persistence\ProxyRepositoryDecorator;

/**
 * @extends PersistentProxyObjectFactory<Tag>
 *
 * @method        Tag|Proxy                              create(array|callable $attributes = [])
 * @method static Tag|Proxy                              createOne(array $attributes = [])
 * @method static Tag|Proxy                              find(object|array|mixed $criteria)
 * @method static Tag|Proxy                              findOrCreate(array $attributes)
 * @method static Tag|Proxy                              first(string $sortedField = 'id')
 * @method static Tag|Proxy                              last(string $sortedField = 'id')
 * @method static Tag|Proxy                              random(array $attributes = [])
 * @method static Tag|Proxy                              randomOrCreate(array $attributes = [])
 * @method static TagRepository|ProxyRepositoryDecorator repository()
 * @method static Tag[]|Proxy[]                          all()
 * @method static Tag[]|Proxy[]                          createMany(int $number, array|callable $attributes = [])
 * @method static Tag[]|Proxy[]                          createSequence(iterable|callable $sequence)
 * @method static Tag[]|Proxy[]                          findBy(array $attributes)
 * @method static Tag[]|Proxy[]                          randomRange(int $min, int $max, array $attributes = [])
 * @method static Tag[]|Proxy[]                          randomSet(int $number, array $attributes = [])
 *
 * @phpstan-method        Tag&Proxy<Tag> create(array|callable $attributes = [])
 * @phpstan-method static Tag&Proxy<Tag> createOne(array $attributes = [])
 * @phpstan-method static Tag&Proxy<Tag> find(object|array|mixed $criteria)
 * @phpstan-method static Tag&Proxy<Tag> findOrCreate(array $attributes)
 * @phpstan-method static Tag&Proxy<Tag> first(string $sortedField = 'id')
 * @phpstan-method static Tag&Proxy<Tag> last(string $sortedField = 'id')
 * @phpstan-method static Tag&Proxy<Tag> random(array $attributes = [])
 * @phpstan-method static Tag&Proxy<Tag> randomOrCreate(array $attributes = [])
 * @phpstan-method static ProxyRepositoryDecorator<Tag, EntityRepository> repository()
 * @phpstan-method static list<Tag&Proxy<Tag>> all()
 * @phpstan-method static list<Tag&Proxy<Tag>> createMany(int $number, array|callable $attributes = [])
 * @phpstan-method static list<Tag&Proxy<Tag>> createSequence(iterable|callable $sequence)
 * @phpstan-method static list<Tag&Proxy<Tag>> findBy(array $attributes)
 * @phpstan-method static list<Tag&Proxy<Tag>> randomRange(int $min, int $max, array $attributes = [])
 * @phpstan-method static list<Tag&Proxy<Tag>> randomSet(int $number, array $attributes = [])
 */
final class TagFactory extends PersistentProxyObjectFactory
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
        return Tag::class;
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#model-factories
     */
    protected function defaults(): array|callable
    {
        return [
            'name' => self::faker()->unique()->word(),
        ];
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#initialization
     */
    protected function initialize(): static
    {
        return $this
            // ->afterInstantiate(function(Tag $tag): void {})
        ;
    }
}
