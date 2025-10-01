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

use App\Entity\AbstractVote;
use App\Entity\DocumentVote;
use Zenstruck\Foundry\Persistence\PersistentProxyObjectFactory;

/**
 * @extends PersistentProxyObjectFactory<DocumentVote>
 */
final class DocumentVoteFactory extends PersistentProxyObjectFactory
{
    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#factories-as-services
     *
     * @todo inject services if required
     */
    public function __construct()
    {
    }

    public static function class(): string
    {
        return DocumentVote::class;
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#model-factories
     *
     * @todo add your default values here
     */
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
    protected function initialize(): static
    {
        return $this
            // ->afterInstantiate(function(DocumentVote $documentVote): void {})
        ;
    }
}
