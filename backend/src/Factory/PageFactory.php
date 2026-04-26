<?php

namespace App\Factory;

use App\Entity\Page;
use Zenstruck\Foundry\Persistence\PersistentObjectFactory;

/**
 * @extends PersistentObjectFactory<Page>
 */
final class PageFactory extends PersistentObjectFactory
{
    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#factories-as-services
     */
    public function __construct() {}

    #[\Override]
    public static function class(): string
    {
        return Page::class;
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#model-factories
     */
    #[\Override]
    protected function defaults(): array|callable
    {
        $name = self::faker()->unique()->text(20);
        return [
            'name_nl' => $name,
            'content_nl' => self::faker()->text(2000),
            'name_en' => $name . ' (en)',
            'content_en' => '(en) ' . self::faker()->text(2000),
            'urlKey' => Page::createUrlKey($name),
            'publicAvailable' => self::faker()->boolean(),
        ];
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#initialization
     */
    #[\Override]
    protected function initialize(): static
    {
        return $this
            // ->afterInstantiate(function(Page $page): void {})
        ;
    }
}
