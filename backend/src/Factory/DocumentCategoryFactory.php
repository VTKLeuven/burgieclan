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

use App\Entity\DocumentCategory;
use App\Repository\DocumentCategoryRepository;
use Zenstruck\Foundry\ModelFactory;
use Zenstruck\Foundry\Proxy;
use Zenstruck\Foundry\RepositoryProxy;

/**
 * @extends ModelFactory<DocumentCategory>
 *
 * @method        DocumentCategory|Proxy                     create(array|callable $attributes = [])
 * @method static DocumentCategory|Proxy                     createOne(array $attributes = [])
 * @method static DocumentCategory|Proxy                     find(object|array|mixed $criteria)
 * @method static DocumentCategory|Proxy                     findOrCreate(array $attributes)
 * @method static DocumentCategory|Proxy                     first(string $sortedField = 'id')
 * @method static DocumentCategory|Proxy                     last(string $sortedField = 'id')
 * @method static DocumentCategory|Proxy                     random(array $attributes = [])
 * @method static DocumentCategory|Proxy                     randomOrCreate(array $attributes = [])
 * @method static DocumentCategoryRepository|RepositoryProxy repository()
 * @method static DocumentCategory[]|Proxy[]                 all()
 * @method static DocumentCategory[]|Proxy[]                 createMany(int $number, array|callable $attributes = [])
 * @method static DocumentCategory[]|Proxy[]                 createSequence(iterable|callable $sequence)
 * @method static DocumentCategory[]|Proxy[]                 findBy(array $attributes)
 * @method static DocumentCategory[]|Proxy[]                 randomRange(int $min, int $max, array $attributes = [])
 * @method static DocumentCategory[]|Proxy[]                 randomSet(int $number, array $attributes = [])
 *
 * @phpstan-method        Proxy<DocumentCategory> create(array|callable $attributes = [])
 * @phpstan-method static Proxy<DocumentCategory> createOne(array $attributes = [])
 * @phpstan-method static Proxy<DocumentCategory> find(object|array|mixed $criteria)
 * @phpstan-method static Proxy<DocumentCategory> findOrCreate(array $attributes)
 * @phpstan-method static Proxy<DocumentCategory> first(string $sortedField = 'id')
 * @phpstan-method static Proxy<DocumentCategory> last(string $sortedField = 'id')
 * @phpstan-method static Proxy<DocumentCategory> random(array $attributes = [])
 * @phpstan-method static Proxy<DocumentCategory> randomOrCreate(array $attributes = [])
 * @phpstan-method static RepositoryProxy<DocumentCategory> repository()
 * @phpstan-method static list<Proxy<DocumentCategory>> all()
 * @phpstan-method static list<Proxy<DocumentCategory>> createMany(int $number, array|callable $attributes = [])
 * @phpstan-method static list<Proxy<DocumentCategory>> createSequence(iterable|callable $sequence)
 * @phpstan-method static list<Proxy<DocumentCategory>> findBy(array $attributes)
 * @phpstan-method static list<Proxy<DocumentCategory>> randomRange(int $min, int $max, array $attributes = [])
 * @phpstan-method static list<Proxy<DocumentCategory>> randomSet(int $number, array $attributes = [])
 */
final class DocumentCategoryFactory extends ModelFactory
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
            'name' => self::faker()->word(),
        ];
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#initialization
     */
    protected function initialize(): self
    {
        return $this
            // ->afterInstantiate(function(DocumentCategory $documentCategory): void {})
        ;
    }

    protected static function getClass(): string
    {
        return DocumentCategory::class;
    }
}