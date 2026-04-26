<?php

namespace App\Factory;

use App\Entity\Module;
use Zenstruck\Foundry\Persistence\PersistentObjectFactory;

/**
 * @extends PersistentObjectFactory<Module>
 */
final class ModuleFactory extends PersistentObjectFactory
{
    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#factories-as-services
     */
    public function __construct() {}

    #[\Override]
    public static function class(): string
    {
        return Module::class;
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#model-factories
     */
    #[\Override]
    protected function defaults(): array|callable
    {
        return self::moduleDefaultsRecursive();
    }

    /**
     * Recursively generate module defaults with starving submodule probability.
     */
    private static function moduleDefaultsRecursive(int $depth = 0): array
    {
        $maxDepth = 3;
        $baseChance = 30; // percent
        $chance = max(0, $baseChance - $depth * 10); // 20%, 10%, 0% ...
        $hasSubmodules = $depth < $maxDepth && self::faker()->boolean($chance);
        return [
            'name' => 'Module: ' . self::faker()->word(),
            // 70% chance to have a null program
            'program' => self::faker()->boolean(70) ? ProgramFactory::randomOrCreate() : null,
            'modules' => $hasSubmodules
                ? array_map(
                    fn() => ModuleFactory::new(self::moduleDefaultsRecursive($depth + 1)),
                    range(1, self::faker()->numberBetween(1, 3))
                )
                : [],
        ];
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#initialization
     */
    #[\Override]
    protected function initialize(): static
    {
        return $this
            // ->afterInstantiate(function(Module $module): void {})
        ;
    }
}
