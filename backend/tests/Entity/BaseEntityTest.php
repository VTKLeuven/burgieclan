<?php

namespace App\Tests\Entity;

use App\Entity\BaseEntity;
use DateTime;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

class BaseEntityTest extends KernelTestCase
{
    /**
     * Create a concrete instance of the abstract BaseEntity class for testing.
     */
    private function createBaseEntityInstance(): BaseEntity
    {
        return new class extends BaseEntity {
            // Anonymous class that extends BaseEntity with no additional implementation needed
        };
    }

    public function testGetId(): void
    {
        $entity = $this->createBaseEntityInstance();
        $this->assertNull($entity->getId(), 'ID should be null for new entity');
    }

    public function testOnPrePersist(): void
    {
        $entity = $this->createBaseEntityInstance();

        // Before onPrePersist, timestamps are not initialized
        // onPrePersist sets both createdAt and updatedAt to current time
        $beforeTime = new DateTime();
        $entity->onPrePersist();
        $afterTime = new DateTime();

        // createdAt should be set to current time
        $this->assertGreaterThanOrEqual($beforeTime, $entity->getCreatedAt());
        $this->assertLessThanOrEqual($afterTime, $entity->getCreatedAt());

        // updatedAt should equal createdAt
        $this->assertEquals($entity->getCreatedAt(), $entity->getUpdatedAt());
    }

    public function testOnPrePersistIdempotent(): void
    {
        $entity = $this->createBaseEntityInstance();

        // Call onPrePersist first time
        $entity->onPrePersist();
        $firstCreatedAt = $entity->getCreatedAt();
        $firstUpdatedAt = $entity->getUpdatedAt();

        // Wait a moment
        sleep(1);

        // Call onPrePersist again - createdAt should not change (null coalescing)
        $entity->onPrePersist();

        $this->assertEquals($firstCreatedAt, $entity->getCreatedAt(), 'createdAt should not change on subsequent onPrePersist calls');
        $this->assertEquals($firstUpdatedAt, $entity->getUpdatedAt());
    }

    public function testOnPreUpdate(): void
    {
        $entity = $this->createBaseEntityInstance();

        // Initialize timestamps via onPrePersist
        $entity->onPrePersist();
        $originalCreatedAt = $entity->getCreatedAt();
        $originalUpdatedAt = $entity->getUpdatedAt();

        // Wait a moment to ensure time difference
        sleep(1);

        // Call onPreUpdate
        $beforeTime = new DateTime();
        $entity->onPreUpdate();
        $afterTime = new DateTime();

        // createdAt should not change on update
        $this->assertEquals($originalCreatedAt, $entity->getCreatedAt());

        // updatedAt should be updated to a new time
        $this->assertGreaterThan($originalUpdatedAt, $entity->getUpdatedAt());
        $this->assertGreaterThanOrEqual($beforeTime, $entity->getUpdatedAt());
        $this->assertLessThanOrEqual($afterTime, $entity->getUpdatedAt());
    }

    public function testToString(): void
    {
        $entity = $this->createBaseEntityInstance();
        $stringRepresentation = (string) $entity;

        $this->assertStringContainsString('BaseEntity', $stringRepresentation);
        $this->assertStringContainsString(' - ', $stringRepresentation);
    }
}
