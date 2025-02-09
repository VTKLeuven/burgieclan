<?php

namespace App\Factory;

use App\Entity\UserDocumentView;
use App\Repository\UserDocumentViewRepository;
use Zenstruck\Foundry\ModelFactory;
use Zenstruck\Foundry\Proxy;
use Zenstruck\Foundry\RepositoryProxy;

/**
 * @extends ModelFactory<UserDocumentView>
 *
 * @method        UserDocumentView|Proxy                     create(array|callable $attributes = [])
 * @method static UserDocumentView|Proxy                     createOne(array $attributes = [])
 * @method static UserDocumentView|Proxy                     find(object|array|mixed $criteria)
 * @method static UserDocumentView|Proxy                     findOrCreate(array $attributes)
 * @method static UserDocumentView|Proxy                     first(string $sortedField = 'id')
 * @method static UserDocumentView|Proxy                     last(string $sortedField = 'id')
 * @method static UserDocumentView|Proxy                     random(array $attributes = [])
 * @method static UserDocumentView|Proxy                     randomOrCreate(array $attributes = [])
 * @method static UserDocumentViewRepository|RepositoryProxy repository()
 * @method static UserDocumentView[]|Proxy[]                all()
 * @method static UserDocumentView[]|Proxy[]                createMany(int $number, array|callable $attributes = [])
 * @method static UserDocumentView[]|Proxy[]                createSequence(iterable|callable $sequence)
 * @method static UserDocumentView[]|Proxy[]                findBy(array $attributes)
 * @method static UserDocumentView[]|Proxy[]                randomRange(int $min, int $max, array $attributes = [])
 * @method static UserDocumentView[]|Proxy[]                randomSet(int $number, array $attributes = [])
 *
 * @phpstan-method        Proxy<UserDocumentView> create(array|callable $attributes = [])
 * @phpstan-method static Proxy<UserDocumentView> createOne(array $attributes = [])
 * @phpstan-method static Proxy<UserDocumentView> find(object|array|mixed $criteria)
 * @phpstan-method static Proxy<UserDocumentView> findOrCreate(array $attributes)
 * @phpstan-method static Proxy<UserDocumentView> first(string $sortedField = 'id')
 * @phpstan-method static Proxy<UserDocumentView> last(string $sortedField = 'id')
 * @phpstan-method static Proxy<UserDocumentView> random(array $attributes = [])
 * @phpstan-method static Proxy<UserDocumentView> randomOrCreate(array $attributes = [])
 * @phpstan-method static RepositoryProxy<UserDocumentView> repository()
 * @phpstan-method static list<Proxy<UserDocumentView>> all()
 * @phpstan-method static list<Proxy<UserDocumentView>> createMany(int $number, array|callable $attributes = [])
 * @phpstan-method static list<Proxy<UserDocumentView>> createSequence(iterable|callable $sequence)
 * @phpstan-method static list<Proxy<UserDocumentView>> findBy(array $attributes)
 * @phpstan-method static list<Proxy<UserDocumentView>> randomRange(int $min, int $max, array $attributes = [])
 * @phpstan-method static list<Proxy<UserDocumentView>> randomSet(int $number, array $attributes = [])
 */
final class UserDocumentViewFactory extends ModelFactory
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
            'user' => UserFactory::random(),
            'document' => DocumentFactory::random(),
            'lastViewed' => self::faker()->dateTimeBetween('-1 month'),
        ];
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#initialization
     */
    protected function initialize(): self
    {
        return $this
            // ->afterInstantiate(function(UserDocumentView $userDocumentView): void {})
            ;
    }

    protected static function getClass(): string
    {
        return UserDocumentView::class;
    }
}
