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

use App\Entity\Page;
use App\Repository\PageRepository;
use Doctrine\ORM\EntityRepository;
use Zenstruck\Foundry\Persistence\PersistentProxyObjectFactory;
use Zenstruck\Foundry\Persistence\Proxy;
use Zenstruck\Foundry\Persistence\ProxyRepositoryDecorator;

/**
 * @extends PersistentProxyObjectFactory<Page>
 *
 * @method        Page|Proxy                              create(array|callable $attributes = [])
 * @method static Page|Proxy                              createOne(array $attributes = [])
 * @method static Page|Proxy                              find(object|array|mixed $criteria)
 * @method static Page|Proxy                              findOrCreate(array $attributes)
 * @method static Page|Proxy                              first(string $sortedField = 'id')
 * @method static Page|Proxy                              last(string $sortedField = 'id')
 * @method static Page|Proxy                              random(array $attributes = [])
 * @method static Page|Proxy                              randomOrCreate(array $attributes = [])
 * @method static PageRepository|ProxyRepositoryDecorator repository()
 * @method static Page[]|Proxy[]                          all()
 * @method static Page[]|Proxy[]                          createMany(int $number, array|callable $attributes = [])
 * @method static Page[]|Proxy[]                          createSequence(iterable|callable $sequence)
 * @method static Page[]|Proxy[]                          findBy(array $attributes)
 * @method static Page[]|Proxy[]                          randomRange(int $min, int $max, array $attributes = [])
 * @method static Page[]|Proxy[]                          randomSet(int $number, array $attributes = [])
 *
 * @phpstan-method        Page&Proxy<Page> create(array|callable $attributes = [])
 * @phpstan-method static Page&Proxy<Page> createOne(array $attributes = [])
 * @phpstan-method static Page&Proxy<Page> find(object|array|mixed $criteria)
 * @phpstan-method static Page&Proxy<Page> findOrCreate(array $attributes)
 * @phpstan-method static Page&Proxy<Page> first(string $sortedField = 'id')
 * @phpstan-method static Page&Proxy<Page> last(string $sortedField = 'id')
 * @phpstan-method static Page&Proxy<Page> random(array $attributes = [])
 * @phpstan-method static Page&Proxy<Page> randomOrCreate(array $attributes = [])
 * @phpstan-method static ProxyRepositoryDecorator<Page, EntityRepository> repository()
 * @phpstan-method static list<Page&Proxy<Page>> all()
 * @phpstan-method static list<Page&Proxy<Page>> createMany(int $number, array|callable $attributes = [])
 * @phpstan-method static list<Page&Proxy<Page>> createSequence(iterable|callable $sequence)
 * @phpstan-method static list<Page&Proxy<Page>> findBy(array $attributes)
 * @phpstan-method static list<Page&Proxy<Page>> randomRange(int $min, int $max, array $attributes = [])
 * @phpstan-method static list<Page&Proxy<Page>> randomSet(int $number, array $attributes = [])
 */
final class PageFactory extends PersistentProxyObjectFactory
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
        return Page::class;
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#model-factories
     */
    protected function defaults(): array|callable
    {
        $name = self::faker()->text(20);
        return [
            'name_nl' => $name,
            'content_nl' => self::faker()->text(2000),
            'name_en' => $name . ' (en)',
            'content_en' => '(en) ' . self::faker()->text(2000),
            'urlKey' => Page::createUrlKey($name),
            'publicAvailable' => self::faker()->boolean(),
        ];
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#initialization
     */
    protected function initialize(): static
    {
        return $this
            // ->afterInstantiate(function(Page $page): void {})
        ;
    }
}
