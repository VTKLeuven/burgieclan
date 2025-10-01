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
use App\Entity\CourseCommentVote;
use Zenstruck\Foundry\Persistence\PersistentProxyObjectFactory;

/**
 * @extends PersistentProxyObjectFactory<CourseCommentVote>
 */
final class CourseCommentVoteFactory extends PersistentProxyObjectFactory
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
        return CourseCommentVote::class;
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#model-factories
     *
     * @todo add your default values here
     */
    protected function defaults(): array|callable
    {
        return [
            'courseComment' => CourseCommentFactory::randomOrCreate(),
            'creator' => UserFactory::randomOrCreate(),
            'voteType' => self::faker()->randomElement([AbstractVote::UPVOTE, AbstractVote::DOWNVOTE]),
        ];
    }

    /**
     * Generate a sequence of unique creator-courseComment combinations
     */
    public static function createUniqueSequence(int $count): array
    {
        $users = UserFactory::all();
        $courseComments = CourseCommentFactory::all();

        $maxPossibleCombinations = count($users) * count($courseComments);

        if ($count > $maxPossibleCombinations) {
            throw new \InvalidArgumentException(
                sprintf(
                    'Cannot create %d unique CourseCommentVote combinations. Maximum possible is %d (users: %d × courseComments: %d)',
                    $count,
                    $maxPossibleCombinations,
                    count($users),
                    count($courseComments)
                )
            );
        }

        // Generate all possible unique combinations
        $combinations = [];
        foreach ($users as $user) {
            foreach ($courseComments as $courseComment) {
                $combinations[] = [
                    'creator' => $user,
                    'courseComment' => $courseComment,
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
            // ->afterInstantiate(function(CourseCommentVote $courseCommentVote): void {})
        ;
    }
}
