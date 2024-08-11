<?php

namespace App\Factory;

use App\Entity\DocumentCommentVote;
use App\Repository\DocumentCommentVoteRepository;
use Zenstruck\Foundry\ModelFactory;
use Zenstruck\Foundry\Proxy;
use Zenstruck\Foundry\RepositoryProxy;

/**
 * @extends ModelFactory<DocumentCommentVote>
 *
 * @method        DocumentCommentVote|Proxy                     create(array|callable $attributes = [])
 * @method static DocumentCommentVote|Proxy                     createOne(array $attributes = [])
 * @method static DocumentCommentVote|Proxy                     find(object|array|mixed $criteria)
 * @method static DocumentCommentVote|Proxy                     findOrCreate(array $attributes)
 * @method static DocumentCommentVote|Proxy                     first(string $sortedField = 'id')
 * @method static DocumentCommentVote|Proxy                     last(string $sortedField = 'id')
 * @method static DocumentCommentVote|Proxy                     random(array $attributes = [])
 * @method static DocumentCommentVote|Proxy                     randomOrCreate(array $attributes = [])
 * @method static DocumentCommentVoteRepository|RepositoryProxy repository()
 * @method static DocumentCommentVote[]|Proxy[]                 all()
 * @method static DocumentCommentVote[]|Proxy[]                 createMany(int $number, array|callable $attributes = [])
 * @method static DocumentCommentVote[]|Proxy[]                 createSequence(iterable|callable $sequence)
 * @method static DocumentCommentVote[]|Proxy[]                 findBy(array $attributes)
 * @method static DocumentCommentVote[]|Proxy[]                 randomRange(int $min, int $max, array $attributes = [])
 * @method static DocumentCommentVote[]|Proxy[]                 randomSet(int $number, array $attributes = [])
 *
 * @phpstan-method        Proxy<DocumentCommentVote> create(array|callable $attributes = [])
 * @phpstan-method static Proxy<DocumentCommentVote> createOne(array $attributes = [])
 * @phpstan-method static Proxy<DocumentCommentVote> find(object|array|mixed $criteria)
 * @phpstan-method static Proxy<DocumentCommentVote> findOrCreate(array $attributes)
 * @phpstan-method static Proxy<DocumentCommentVote> first(string $sortedField = 'id')
 * @phpstan-method static Proxy<DocumentCommentVote> last(string $sortedField = 'id')
 * @phpstan-method static Proxy<DocumentCommentVote> random(array $attributes = [])
 * @phpstan-method static Proxy<DocumentCommentVote> randomOrCreate(array $attributes = [])
 * @phpstan-method static RepositoryProxy<DocumentCommentVote> repository()
 * @phpstan-method static list<Proxy<DocumentCommentVote>> all()
 * @phpstan-method static list<Proxy<DocumentCommentVote>> createMany(int $number, array|callable $attributes = [])
 * @phpstan-method static list<Proxy<DocumentCommentVote>> createSequence(iterable|callable $sequence)
 * @phpstan-method static list<Proxy<DocumentCommentVote>> findBy(array $attributes)
 * @phpstan-method static list<Proxy<DocumentCommentVote>> randomRange(int $min, int $max, array $attributes = [])
 * @phpstan-method static list<Proxy<DocumentCommentVote>> randomSet(int $number, array $attributes = [])
 */
final class DocumentCommentVoteFactory extends ModelFactory
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
            'documentComment' => DocumentCommentFactory::randomOrCreate(),
            'creator' => UserFactory::randomOrCreate(),
        ];
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#initialization
     */
    protected function initialize(): self
    {
        return $this
            // ->afterInstantiate(function(DocumentCommentVote $documentCommentVote): void {})
            ;
    }

    protected static function getClass(): string
    {
        return DocumentCommentVote::class;
    }
}
