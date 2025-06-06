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

use App\Entity\Document;
use App\Repository\DocumentRepository;
use Doctrine\ORM\EntityRepository;
use Zenstruck\Foundry\Persistence\PersistentProxyObjectFactory;
use Zenstruck\Foundry\Persistence\Proxy;
use Zenstruck\Foundry\Persistence\ProxyRepositoryDecorator;

/**
 * @extends PersistentProxyObjectFactory<Document>
 *
 * @method        Document|Proxy                              create(array|callable $attributes = [])
 * @method static Document|Proxy                              createOne(array $attributes = [])
 * @method static Document|Proxy                              find(object|array|mixed $criteria)
 * @method static Document|Proxy                              findOrCreate(array $attributes)
 * @method static Document|Proxy                              first(string $sortedField = 'id')
 * @method static Document|Proxy                              last(string $sortedField = 'id')
 * @method static Document|Proxy                              random(array $attributes = [])
 * @method static Document|Proxy                              randomOrCreate(array $attributes = [])
 * @method static DocumentRepository|ProxyRepositoryDecorator repository()
 * @method static Document[]|Proxy[]                          all()
 * @method static Document[]|Proxy[]                          createMany(int $number, array|callable $attributes = [])
 * @method static Document[]|Proxy[]                          createSequence(iterable|callable $sequence)
 * @method static Document[]|Proxy[]                          findBy(array $attributes)
 * @method static Document[]|Proxy[]                          randomRange(int $min, int $max, array $attributes = [])
 * @method static Document[]|Proxy[]                          randomSet(int $number, array $attributes = [])
 *
 * @phpstan-method        Document&Proxy<Document> create(array|callable $attributes = [])
 * @phpstan-method static Document&Proxy<Document> createOne(array $attributes = [])
 * @phpstan-method static Document&Proxy<Document> find(object|array|mixed $criteria)
 * @phpstan-method static Document&Proxy<Document> findOrCreate(array $attributes)
 * @phpstan-method static Document&Proxy<Document> first(string $sortedField = 'id')
 * @phpstan-method static Document&Proxy<Document> last(string $sortedField = 'id')
 * @phpstan-method static Document&Proxy<Document> random(array $attributes = [])
 * @phpstan-method static Document&Proxy<Document> randomOrCreate(array $attributes = [])
 * @phpstan-method static ProxyRepositoryDecorator<Document, EntityRepository> repository()
 * @phpstan-method static list<Document&Proxy<Document>> all()
 * @phpstan-method static list<Document&Proxy<Document>> createMany(int $number, array|callable $attributes = [])
 * @phpstan-method static list<Document&Proxy<Document>> createSequence(iterable|callable $sequence)
 * @phpstan-method static list<Document&Proxy<Document>> findBy(array $attributes)
 * @phpstan-method static list<Document&Proxy<Document>> randomRange(int $min, int $max, array $attributes = [])
 * @phpstan-method static list<Document&Proxy<Document>> randomSet(int $number, array $attributes = [])
 */
final class DocumentFactory extends PersistentProxyObjectFactory
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
        return Document::class;
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#model-factories
     */
    protected function defaults(): array|callable
    {
        return [
            'category' => DocumentCategoryFactory::randomOrCreate(),
            'course' => CourseFactory::randomOrCreate(),
            'name' => self::faker()->word(),
            'under_review' => self::faker()->boolean(),
            'anonymous' => self::faker()->boolean(),
            'creator' => UserFactory::randomOrCreate(),
            // Selects a random file from the 'data/documents' directory and assigns its basename to 'file_name'.
            // Uses the 'glob' function to get all files in the directory and 'randomElement' to pick one randomly.
            'file_name' => basename(self::faker()->randomElement(glob('data/documents/*'))),
            'year' => $this->generateYear(),
            'tags' => TagFactory::randomSet(self::faker()->numberBetween(0, 3)),
        ];
    }

    private function generateYear(): string
    {
        $startYear = self::faker()->numberBetween(1999, 2024);
        $endYear = $startYear + 1;
        return sprintf('%d - %d', $startYear, $endYear);
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#initialization
     */
    protected function initialize(): static
    {
        return $this
            // ->afterInstantiate(function(Document $document): void {})
        ;
    }
}
