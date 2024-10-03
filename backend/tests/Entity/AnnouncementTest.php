<?php

namespace App\Tests\Entity;

use App\Entity\Announcement;
use App\Entity\User;
use DateTime;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

class AnnouncementTest extends KernelTestCase
{
    public function testSetTitle(): void
    {
        $user = $this->createMock(User::class);
        $announcement = new Announcement($user);
        $announcement->setTitle("Announcement");

        $this->assertSame("Announcement", $announcement->getTitle());
    }

    public function testSetContent(): void
    {
        $user = $this->createMock(User::class);
        $announcement = new Announcement($user);
        $announcement->setContent("Announcement content");

        $this->assertSame("Announcement content", $announcement->getContent());
    }

    public function testSetStartTime(): void
    {
        $user = $this->createMock(User::class);
        $announcement = new Announcement($user);
        $starttime = new DateTime();
        $announcement->setStartTime($starttime);

        $this->assertSame($starttime, $announcement->getStartTime());
    }

    public function testSetEndTime(): void
    {
        $user = $this->createMock(User::class);
        $announcement = new Announcement($user);
        $endtime = new DateTime();
        $announcement->setEndTime($endtime);

        $this->assertSame($endtime, $announcement->getEndTime());
    }
}
