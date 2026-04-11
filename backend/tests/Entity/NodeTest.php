<?php

namespace App\Tests\Entity;

use App\Entity\BaseEntity;
use App\Entity\Node;
use App\Entity\User;
use DateTime;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

class NodeTest extends KernelTestCase
{
    /**
     * Create a concrete instance of the abstract Node class for testing.
     */
    private function createNodeInstance(User $creator): Node
    {
        return new class ($creator) extends Node {
            // Anonymous class that extends Node with no additional implementation needed
        };
    }

    public function testConstructNode(): void
    {
        $creator = $this->createStub(User::class);
        $node = $this->createNodeInstance($creator);

        // Node constructor sets creator but does not initialize timestamps
        // Timestamps are initialized via Doctrine lifecycle callbacks (onPrePersist)
        $this->assertSame($creator, $node->getCreator());
    }

    public function testTimestampsInitializedByPrePersist(): void
    {
        $creator = $this->createStub(User::class);
        $node = $this->createNodeInstance($creator);

        // Simulate Doctrine's onPrePersist lifecycle event
        $beforeTime = new DateTime();
        $node->onPrePersist();
        $afterTime = new DateTime();

        // Verify timestamps are now set
        $this->assertGreaterThanOrEqual($beforeTime, $node->getCreatedAt());
        $this->assertLessThanOrEqual($afterTime, $node->getCreatedAt());
        $this->assertGreaterThanOrEqual($beforeTime, $node->getUpdatedAt());
        $this->assertLessThanOrEqual($afterTime, $node->getUpdatedAt());
    }

    public function testGetCreator(): void
    {
        $creator = $this->createStub(User::class);
        $node = $this->createNodeInstance($creator);

        $this->assertSame($creator, $node->getCreator());
    }

    public function testSetCreator(): void
    {
        $creator = $this->createStub(User::class);
        $node = $this->createNodeInstance($creator);

        $newCreator = $this->createStub(User::class);
        $returnedNode = $node->setCreator($newCreator);

        $this->assertSame($newCreator, $node->getCreator());
        $this->assertSame($node, $returnedNode, 'setCreator should return self for fluent interface');
    }
}
