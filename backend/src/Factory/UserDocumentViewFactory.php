<?php

namespace App\Factory;

use App\Entity\UserDocumentView;
use Zenstruck\Foundry\Persistence\PersistentObjectFactory;

/**
 * @extends PersistentObjectFactory<UserDocumentView>
 */
final class UserDocumentViewFactory extends PersistentObjectFactory
{
    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#factories-as-services
     */
    public function __construct()
    {
    }

    #[\Override]
    public static function class(): string
    {
        return UserDocumentView::class;
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#model-factories
     */
    #[\Override]
    protected function defaults(): array|callable
    {
        return [
            'user' => UserFactory::randomOrCreate(),
            'document' => DocumentFactory::randomOrCreate(),
            'lastViewed' => self::faker()->dateTimeBetween('-1 month'),
        ];
    }

    /**
     * Generate a sequence of unique user-document combinations
     */
    public static function createUniqueSequence(int $count): array
    {
        $users = UserFactory::all();
        $documents = DocumentFactory::all();

        $maxPossibleCombinations = count($users) * count($documents);

        if ($count > $maxPossibleCombinations) {
            throw new \InvalidArgumentException(
                sprintf(
                    'Cannot create %d unique UserDocumentView combinations. Maximum possible is %d (users: %d × documents: %d)',
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
                    'user' => $user,
                    'document' => $document,
                    'lastViewed' => self::faker()->dateTimeBetween('-1 month'),
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
            // ->afterInstantiate(function(UserDocumentView $userDocumentView): void {})
        ;
    }
}
