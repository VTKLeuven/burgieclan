<?php

namespace App\Factory;

use App\Entity\Document;
use Zenstruck\Foundry\Persistence\PersistentObjectFactory;

/**
 * @extends PersistentObjectFactory<Document>
 */
final class DocumentFactory extends PersistentObjectFactory
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
        return Document::class;
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#model-factories
     */
    #[\Override]
    protected function defaults(): array|callable
    {
        return function () {
            $tagsNeeded = self::faker()->numberBetween(1, 3);
            $totalTags = count(TagFactory::all());

            // Only create extra tags if needed
            if ($totalTags < $tagsNeeded) {
                for ($i = 0; $i < $tagsNeeded - $totalTags; $i++) {
                    TagFactory::createOne();
                }
            }

            return [
                'category' => DocumentCategoryFactory::randomOrCreate(),
                'course' => CourseFactory::randomOrCreate(),
                'name' => self::faker()->word(),
                'under_review' => self::faker()->boolean(),
                'anonymous' => self::faker()->boolean(),
                'creator' => UserFactory::randomOrCreate(),
                // Selects a random file from the 'data/documents' directory and assigns its basename to 'file_name'.
                // Uses the 'glob' function to get all files in the directory and 'randomElement' to pick one randomly.
                'file_name' => basename(self::faker()->randomElement(glob('data/documents/*'))),
                'year' => $this->generateYear(),
                'tags' => TagFactory::randomSet($tagsNeeded),
            ];
        };
    }

    private function generateYear(): string
    {
        $startYear = self::faker()->numberBetween(1999, 2024);
        $endYear = $startYear + 1;
        return sprintf('%d - %d', $startYear, $endYear);
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#initialization
     */
    #[\Override]
    protected function initialize(): static
    {
        return $this
            // ->afterInstantiate(function(Document $document): void {})
        ;
    }
}
