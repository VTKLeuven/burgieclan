<?php

namespace App\Factory;

use App\Entity\Announcement;
use DateInterval;
use DateTimeImmutable;
use Zenstruck\Foundry\Persistence\PersistentObjectFactory;

/**
 * @extends PersistentObjectFactory<Announcement>
 */
final class AnnouncementFactory extends PersistentObjectFactory
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
        return Announcement::class;
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#model-factories
     */
    #[\Override]
    protected function defaults(): array|callable
    {
        $createdAt = new DateTimeImmutable();
        $startTime = $createdAt->add(new DateInterval('P' . self::faker()->numberBetween(1, 10) . 'D'));
        $endTime = $startTime->add(new DateInterval('P' . self::faker()->numberBetween(1, 10) . 'D'));
        return [
            'title_nl' => self::faker()->word(),
            'title_en' => self::faker()->word(),
            'content_nl' => self::faker()->text(),
            'content_en' => self::faker()->text(),
            'startTime' => $startTime,
            'endTime' => $endTime,
            'priority' => self::faker()->boolean(),
            'creator' => UserFactory::randomOrCreate(),
        ];
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#initialization
     */
    #[\Override]
    protected function initialize(): static
    {
        return $this
            // ->afterInstantiate(function(Announcement $announcement): void {})
        ;
    }
}
