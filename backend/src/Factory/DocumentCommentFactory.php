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

use App\Entity\DocumentComment;
use App\Repository\DocumentCommentRepository;
use Doctrine\ORM\EntityRepository;
use Zenstruck\Foundry\Persistence\PersistentProxyObjectFactory;
use Zenstruck\Foundry\Persistence\Proxy;
use Zenstruck\Foundry\Persistence\ProxyRepositoryDecorator;

/**
 * @extends PersistentProxyObjectFactory<DocumentComment>
 *
 * @method        DocumentComment|Proxy                              create(array|callable $attributes = [])
 * @method static DocumentComment|Proxy                              createOne(array $attributes = [])
 * @method static DocumentComment|Proxy                              find(object|array|mixed $criteria)
 * @method static DocumentComment|Proxy                              findOrCreate(array $attributes)
 * @method static DocumentComment|Proxy                              first(string $sortedField = 'id')
 * @method static DocumentComment|Proxy                              last(string $sortedField = 'id')
 * @method static DocumentComment|Proxy                              random(array $attributes = [])
 * @method static DocumentComment|Proxy                              randomOrCreate(array $attributes = [])
 * @method static DocumentCommentRepository|ProxyRepositoryDecorator repository()
 * @method static DocumentComment[]|Proxy[]                          all()
 * @method static DocumentComment[]|Proxy[]                          createMany(int $number, array|callable $attributes = [])
 * @method static DocumentComment[]|Proxy[]                          createSequence(iterable|callable $sequence)
 * @method static DocumentComment[]|Proxy[]                          findBy(array $attributes)
 * @method static DocumentComment[]|Proxy[]                          randomRange(int $min, int $max, array $attributes = [])
 * @method static DocumentComment[]|Proxy[]                          randomSet(int $number, array $attributes = [])
 *
 * @phpstan-method        DocumentComment&Proxy<DocumentComment> create(array|callable $attributes = [])
 * @phpstan-method static DocumentComment&Proxy<DocumentComment> createOne(array $attributes = [])
 * @phpstan-method static DocumentComment&Proxy<DocumentComment> find(object|array|mixed $criteria)
 * @phpstan-method static DocumentComment&Proxy<DocumentComment> findOrCreate(array $attributes)
 * @phpstan-method static DocumentComment&Proxy<DocumentComment> first(string $sortedField = 'id')
 * @phpstan-method static DocumentComment&Proxy<DocumentComment> last(string $sortedField = 'id')
 * @phpstan-method static DocumentComment&Proxy<DocumentComment> random(array $attributes = [])
 * @phpstan-method static DocumentComment&Proxy<DocumentComment> randomOrCreate(array $attributes = [])
 * @phpstan-method static ProxyRepositoryDecorator<DocumentComment, EntityRepository> repository()
 * @phpstan-method static list<DocumentComment&Proxy<DocumentComment>> all()
 * @phpstan-method static list<DocumentComment&Proxy<DocumentComment>> createMany(int $number, array|callable $attributes = [])
 * @phpstan-method static list<DocumentComment&Proxy<DocumentComment>> createSequence(iterable|callable $sequence)
 * @phpstan-method static list<DocumentComment&Proxy<DocumentComment>> findBy(array $attributes)
 * @phpstan-method static list<DocumentComment&Proxy<DocumentComment>> randomRange(int $min, int $max, array $attributes = [])
 * @phpstan-method static list<DocumentComment&Proxy<DocumentComment>> randomSet(int $number, array $attributes = [])
 */
final class DocumentCommentFactory extends PersistentProxyObjectFactory
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
        return DocumentComment::class;
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#model-factories
     */
    protected function defaults(): array
    {
        return [
            'anonymous' => self::faker()->boolean(),
            'content' => self::faker()->text(),
            'document' => DocumentFactory::randomOrCreate(),
            'creator' => UserFactory::randomOrCreate(),
        ];
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#initialization
     */
    protected function initialize(): static
    {
        return $this
            // ->afterInstantiate(function(DocumentComment $documentComment): void {})
        ;
    }
}
