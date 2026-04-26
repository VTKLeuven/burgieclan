<?php

namespace App\Factory;

use App\Entity\AbstractVote;
use App\Entity\DocumentCommentVote;
use Zenstruck\Foundry\Persistence\PersistentObjectFactory;

/**
 * @extends PersistentObjectFactory<DocumentCommentVote>
 */
final class DocumentCommentVoteFactory extends PersistentObjectFactory
{
    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#factories-as-services
     */
    public function __construct() {}

    #[\Override]
    public static function class(): string
    {
        return DocumentCommentVote::class;
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#model-factories
     */
    #[\Override]
    protected function defaults(): array|callable
    {
        return [
            'creator' => UserFactory::randomOrCreate(),
            'documentComment' => DocumentCommentFactory::randomOrCreate(),
            'voteType' => self::faker()->randomElement([AbstractVote::UPVOTE, AbstractVote::DOWNVOTE]),
        ];
    }

    /**
     * Generate a sequence of unique creator-documentComment combinations
     */
    public static function createUniqueSequence(int $count): array
    {
        $users = UserFactory::all();
        $documentComments = DocumentCommentFactory::all();

        $maxPossibleCombinations = count($users) * count($documentComments);

        if ($count > $maxPossibleCombinations) {
            throw new \InvalidArgumentException(
                sprintf(
                    'Cannot create %d unique DocumentCommentVote combinations. Maximum possible is %d (users: %d × documentComments: %d)',
                    $count,
                    $maxPossibleCombinations,
                    count($users),
                    count($documentComments)
                )
            );
        }

        // Generate all possible unique combinations
        $combinations = [];
        foreach ($users as $user) {
            foreach ($documentComments as $documentComment) {
                $combinations[] = [
                    'creator' => $user,
                    'documentComment' => $documentComment,
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
            // ->afterInstantiate(function(DocumentCommentVote $documentCommentVote): void {})
        ;
    }
}
