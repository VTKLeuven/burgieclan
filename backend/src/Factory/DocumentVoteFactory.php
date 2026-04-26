<?php

namespace App\Factory;

use App\Entity\AbstractVote;
use App\Entity\DocumentVote;
use Zenstruck\Foundry\Persistence\PersistentObjectFactory;

/**
 * @extends PersistentObjectFactory<DocumentVote>
 */
final class DocumentVoteFactory extends PersistentObjectFactory
{
    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#factories-as-services
     */
    public function __construct() {}

    #[\Override]
    public static function class(): string
    {
        return DocumentVote::class;
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#model-factories
     */
    #[\Override]
    protected function defaults(): array|callable
    {
        return [
            'creator' => UserFactory::randomOrCreate(),
            'document' => DocumentFactory::randomOrCreate(),
            'voteType' => self::faker()->randomElement([AbstractVote::UPVOTE, AbstractVote::DOWNVOTE]),
        ];
    }

    /**
     * Generate a sequence of unique creator-document combinations
     */
    public static function createUniqueSequence(int $count): array
    {
        $users = UserFactory::all();
        $documents = DocumentFactory::all();

        $maxPossibleCombinations = count($users) * count($documents);

        if ($count > $maxPossibleCombinations) {
            throw new \InvalidArgumentException(
                sprintf(
                    'Cannot create %d unique DocumentVote combinations. Maximum possible is %d (users: %d × documents: %d)',
                    $count,
                    $maxPossibleCombinations,
                    count($users),
                    count($documents)
                )
            );
        }

        // Generate all possible unique combinations
        $combinations = [];
        foreach ($users as $user) {
            foreach ($documents as $document) {
                $combinations[] = [
                    'creator' => $user,
                    'document' => $document,
                    'voteType' => self::faker()->randomElement([AbstractVote::UPVOTE, AbstractVote::DOWNVOTE]),
                ];
            }
        }

        // Shuffle to randomize and take only the requested count
        shuffle($combinations);
        return array_slice($combinations, 0, $count);
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#initialization
     */
    #[\Override]
    protected function initialize(): static
    {
        return $this
            // ->afterInstantiate(function(DocumentVote $documentVote): void {})
        ;
    }
}
