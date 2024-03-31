<?php

namespace App\Tests\Entity;

use App\Entity\Node;
use App\Entity\User;
use Doctrine\DBAL\Types\Types;
use PHPUnit\Framework\TestCase;

class NodeTest extends TestCase
{
    public function testConstructNode()
    {

        $beforedate = new \DateTime();
        $nodeMock = $this->getMockBuilder(Node::class)
        ->getMockForAbstractClass();
        $afterdate = new \DateTime();
        $this->assertGreaterThanOrEqual($beforedate, $nodeMock->getCreateDate(), 'The createDate should be set to the current date');
        $this->assertLessThanOrEqual($afterdate, $nodeMock->getCreateDate());
    }

    public function testSetUpdate()
    {
        $nodeMock = $this->getMockBuilder(Node::class)
            ->getMockForAbstractClass();

        $beforedate = new \DateTime();
        $nodeMock->setUpdateDate();
        $afterdate = new \DateTime();

        $this->assertGreaterThanOrEqual($beforedate, $nodeMock->getUpdateDate(), 'The updateDate should be set to the current date');
        $this->assertLessThanOrEqual($afterdate, $nodeMock->getUpdateDate());
    }

    public function testSetUser()
    {
        $nodeMock = $this->getMockBuilder(Node::class)
            ->getMockForAbstractClass();

        $this->assertNull($nodeMock->getUser());

        $user = $this->createMock(User::class);
        $nodeMock->setUser($user);
        $this->assertSame($user, $nodeMock->getUser());
    }
}
