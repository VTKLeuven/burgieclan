<?php

namespace App\Tests\Entity;

use App\Entity\Notification;
use App\Entity\User;
use DateTime;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

class NotificationTest extends KernelTestCase
{
    public function testSetTitle(): void
    {
        $user = $this->createMock(User::class);
        $notification = new Notification($user);
        $notification->setTitle("Notification");

        $this->assertSame("Notification", $notification->getTitle());
    }

    public function testSetContent(): void
    {
        $user = $this->createMock(User::class);
        $notification = new Notification($user);
        $notification->setContent("Notification content");

        $this->assertSame("Notification content", $notification->getContent());
    }

    public function testSetStartTime(): void
    {
        $user = $this->createMock(User::class);
        $notification = new Notification($user);
        $starttime = new DateTime();
        $notification->setStartTime($starttime);

        $this->assertSame($starttime, $notification->getStartTime());
    }

    public function testSetEndTime(): void
    {
        $user = $this->createMock(User::class);
        $notification = new Notification($user);
        $endtime = new DateTime();
        $notification->setEndTime($endtime);

        $this->assertSame($endtime, $notification->getEndTime());
    }
}
