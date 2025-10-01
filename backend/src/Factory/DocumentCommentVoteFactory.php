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
use App\Entity\DocumentCommentVote;
use Zenstruck\Foundry\Persistence\PersistentProxyObjectFactory;

/**
 * @extends PersistentProxyObjectFactory<DocumentCommentVote>
 */
final class DocumentCommentVoteFactory extends PersistentProxyObjectFactory
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
        return DocumentCommentVote::class;
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
    protected function initialize(): static
    {
        return $this
            // ->afterInstantiate(function(DocumentCommentVote $documentCommentVote): void {})
        ;
    }
}
