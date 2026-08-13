<?php

namespace App\Factory;

use App\Entity\FaqQuestion;
use Zenstruck\Foundry\Persistence\PersistentObjectFactory;

/**
 * @extends PersistentObjectFactory<FaqQuestion>
 */
final class FaqQuestionFactory extends PersistentObjectFactory
{
    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#factories-as-services
     */
    public function __construct() {}

    #[\Override]
    public static function class(): string
    {
        return FaqQuestion::class;
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#model-factories
     */
    #[\Override]
    protected function defaults(): array|callable
    {
        return [
            // Long enough to clear the 10-character minimum the API enforces.
            'question' => rtrim(self::faker()->sentence(), '.') . '?',
            'locale' => self::faker()->randomElement(FaqQuestion::getAvailableLocales()),
            'status' => FaqQuestion::STATUS_NEW,
            'author' => UserFactory::randomOrCreate(),
        ];
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#initialization
     */
    #[\Override]
    protected function initialize(): static
    {
        return $this;
    }
}
