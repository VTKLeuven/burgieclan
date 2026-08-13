<?php

namespace App\Factory;

use App\Entity\FaqItem;
use Zenstruck\Foundry\Persistence\PersistentObjectFactory;

/**
 * @extends PersistentObjectFactory<FaqItem>
 */
final class FaqItemFactory extends PersistentObjectFactory
{
    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#factories-as-services
     */
    public function __construct() {}

    #[\Override]
    public static function class(): string
    {
        return FaqItem::class;
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#model-factories
     */
    #[\Override]
    protected function defaults(): array|callable
    {
        $question = rtrim(self::faker()->sentence(), '.') . '?';

        return [
            'question_nl' => $question,
            'question_en' => $question . ' (en)',
            'answer_nl' => self::faker()->paragraph(),
            'answer_en' => self::faker()->paragraph(),
            'position' => self::faker()->numberBetween(0, 50),
            'published' => true,
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
