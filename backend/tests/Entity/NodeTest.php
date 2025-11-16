<?php

namespace App\Tests\Entity;

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

    public function testConstructNode()
    {
        $creator = $this->createMock(User::class);
        $beforedate = new DateTime();
        $node = $this->createNodeInstance($creator);
        $afterdate = new DateTime();
        $this->assertGreaterThanOrEqual($beforedate, $node->getCreateDate(), 'The createDate should be set to the current date');
        $this->assertLessThanOrEqual($afterdate, $node->getCreateDate());
    }

    public function testSetUpdate()
    {
        $creator = $this->createMock(User::class);
        $node = $this->createNodeInstance($creator);

        $beforedate = new DateTime();
        $node->setUpdateDate();
        $afterdate = new DateTime();

        $this->assertGreaterThanOrEqual($beforedate, $node->getUpdateDate(), 'The updateDate should be set to the current date');
        $this->assertLessThanOrEqual($afterdate, $node->getUpdateDate());
    }

    public function testSetUser()
    {
        $creator = $this->createMock(User::class);
        $node = $this->createNodeInstance($creator);

        $this->assertSame($creator, $node->getCreator());

        $user = $this->createMock(User::class);
        $node->setCreator($user);
        $this->assertSame($user, $node->getCreator());
    }
}
