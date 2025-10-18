<?php

namespace App\Tests\Entity;

use App\Entity\Announcement;
use App\Entity\User;
use DateTime;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

class AnnouncementTest extends KernelTestCase
{
    public function testSetTitleNl(): void
    {
        $user = $this->createMock(User::class);
        $announcement = new Announcement($user);
        $announcement->setTitleNl("Dutch Announcement");

        $this->assertSame("Dutch Announcement", $announcement->getTitleNl());
    }

    public function testSetTitleEn(): void
    {
        $user = $this->createMock(User::class);
        $announcement = new Announcement($user);
        $announcement->setTitleEn("English Announcement");

        $this->assertSame("English Announcement", $announcement->getTitleEn());
    }

    public function testSetContentNl(): void
    {
        $user = $this->createMock(User::class);
        $announcement = new Announcement($user);
        $announcement->setContentNl("Dutch announcement content");

        $this->assertSame("Dutch announcement content", $announcement->getContentNl());
    }

    public function testSetContentEn(): void
    {
        $user = $this->createMock(User::class);
        $announcement = new Announcement($user);
        $announcement->setContentEn("English announcement content");

        $this->assertSame("English announcement content", $announcement->getContentEn());
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

    public function testSetPriority(): void
    {
        $user = $this->createMock(User::class);
        $announcement = new Announcement($user);
        $announcement->setPriority(true);

        $this->assertTrue($announcement->isPriority());

        $announcement->setPriority(false);
        $this->assertFalse($announcement->isPriority());
    }
}
