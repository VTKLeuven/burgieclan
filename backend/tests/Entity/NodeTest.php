<?php

namespace App\Tests\Entity;

use App\Entity\Node;
use App\Entity\User;
use DateTime;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

class NodeTest extends KernelTestCase
{
    public function testConstructNode()
    {
        $creator = $this->createMock(User::class);
        $beforedate = new DateTime();
        /** @var Node $nodeMock */
        $nodeMock = $this->getMockBuilder(Node::class)
            ->setConstructorArgs(array($creator))
            ->getMockForAbstractClass();
        $afterdate = new DateTime();
        $this->assertGreaterThanOrEqual($beforedate, $nodeMock->getCreateDate(), 'The createDate should be set to the current date');
        $this->assertLessThanOrEqual($afterdate, $nodeMock->getCreateDate());
    }

    public function testSetUpdate()
    {
        $creator = $this->createMock(User::class);
        $nodeMock = $this->getMockBuilder(Node::class)
            ->setConstructorArgs(array($creator))
            ->getMockForAbstractClass();

        $beforedate = new DateTime();
        $nodeMock->setUpdateDate();
        $afterdate = new DateTime();

        $this->assertGreaterThanOrEqual($beforedate, $nodeMock->getUpdateDate(), 'The updateDate should be set to the current date');
        $this->assertLessThanOrEqual($afterdate, $nodeMock->getUpdateDate());
    }

    public function testSetUser()
    {
        $creator = $this->createMock(User::class);
        $nodeMock = $this->getMockBuilder(Node::class)
            ->setConstructorArgs(array($creator))
            ->getMockForAbstractClass();

        $this->assertSame($creator, $nodeMock->getCreator());

        $user = $this->createMock(User::class);
        $nodeMock->setCreator($user);
        $this->assertSame($user, $nodeMock->getCreator());
    }
}
