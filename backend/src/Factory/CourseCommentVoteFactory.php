<?php

namespace App\Factory;

use App\Entity\AbstractVote;
use App\Entity\CourseCommentVote;
use Zenstruck\Foundry\Persistence\PersistentObjectFactory;

/**
 * @extends PersistentObjectFactory<CourseCommentVote>
 */
final class CourseCommentVoteFactory extends PersistentObjectFactory
{
    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#factories-as-services
     */
    public function __construct() {}

    #[\Override]
    public static function class(): string
    {
        return CourseCommentVote::class;
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#model-factories
     */
    #[\Override]
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
    #[\Override]
    protected function initialize(): static
    {
        return $this
            // ->afterInstantiate(function(CourseCommentVote $courseCommentVote): void {})
        ;
    }
}
