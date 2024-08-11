<?php

namespace App\Factory;

use App\Entity\DocumentVote;
use App\Repository\DocumentVoteRepository;
use Zenstruck\Foundry\ModelFactory;
use Zenstruck\Foundry\Proxy;
use Zenstruck\Foundry\RepositoryProxy;

/**
 * @extends ModelFactory<DocumentVote>
 *
 * @method        DocumentVote|Proxy                     create(array|callable $attributes = [])
 * @method static DocumentVote|Proxy                     createOne(array $attributes = [])
 * @method static DocumentVote|Proxy                     find(object|array|mixed $criteria)
 * @method static DocumentVote|Proxy                     findOrCreate(array $attributes)
 * @method static DocumentVote|Proxy                     first(string $sortedField = 'id')
 * @method static DocumentVote|Proxy                     last(string $sortedField = 'id')
 * @method static DocumentVote|Proxy                     random(array $attributes = [])
 * @method static DocumentVote|Proxy                     randomOrCreate(array $attributes = [])
 * @method static DocumentVoteRepository|RepositoryProxy repository()
 * @method static DocumentVote[]|Proxy[]                 all()
 * @method static DocumentVote[]|Proxy[]                 createMany(int $number, array|callable $attributes = [])
 * @method static DocumentVote[]|Proxy[]                 createSequence(iterable|callable $sequence)
 * @method static DocumentVote[]|Proxy[]                 findBy(array $attributes)
 * @method static DocumentVote[]|Proxy[]                 randomRange(int $min, int $max, array $attributes = [])
 * @method static DocumentVote[]|Proxy[]                 randomSet(int $number, array $attributes = [])
 *
 * @phpstan-method        Proxy<DocumentVote> create(array|callable $attributes = [])
 * @phpstan-method static Proxy<DocumentVote> createOne(array $attributes = [])
 * @phpstan-method static Proxy<DocumentVote> find(object|array|mixed $criteria)
 * @phpstan-method static Proxy<DocumentVote> findOrCreate(array $attributes)
 * @phpstan-method static Proxy<DocumentVote> first(string $sortedField = 'id')
 * @phpstan-method static Proxy<DocumentVote> last(string $sortedField = 'id')
 * @phpstan-method static Proxy<DocumentVote> random(array $attributes = [])
 * @phpstan-method static Proxy<DocumentVote> randomOrCreate(array $attributes = [])
 * @phpstan-method static RepositoryProxy<DocumentVote> repository()
 * @phpstan-method static list<Proxy<DocumentVote>> all()
 * @phpstan-method static list<Proxy<DocumentVote>> createMany(int $number, array|callable $attributes = [])
 * @phpstan-method static list<Proxy<DocumentVote>> createSequence(iterable|callable $sequence)
 * @phpstan-method static list<Proxy<DocumentVote>> findBy(array $attributes)
 * @phpstan-method static list<Proxy<DocumentVote>> randomRange(int $min, int $max, array $attributes = [])
 * @phpstan-method static list<Proxy<DocumentVote>> randomSet(int $number, array $attributes = [])
 */
final class DocumentVoteFactory extends ModelFactory
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
            'isUpvote' => self::faker()->boolean(),
            'document' => DocumentFactory::randomOrCreate(),
            'creator' => UserFactory::randomOrCreate(),
        ];
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#initialization
     */
    protected function initialize(): self
    {
        return $this
            // ->afterInstantiate(function(DocumentVote $documentVote): void {})
            ;
    }

    protected static function getClass(): string
    {
        return DocumentVote::class;
    }
}
