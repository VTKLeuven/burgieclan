<?php

namespace App\Tests\Entity;

use App\Entity\Page;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

class PageTest extends KernelTestCase
{
    public function testSetName(): void
    {
        $page = new Page('Name of this page');
        $page->setNameNl("Page 1");

        $this->assertSame("Page 1", $page->getNameNl());
        $this->assertSame("Page 1", $page->getName('nl'));
    }

    public function testSetUrlKey(): void
    {
        $page = new Page('Name of this page');
        $urlKey = 'new url key';
        $page->setUrlKey($urlKey);

        $this->assertSame(Page::createUrlKey($urlKey), $page->getUrlKey());
    }

    public function testSetContent(): void
    {
        $page = new Page('Name of this page');
        $page->setContentNl("some content");

        $this->assertSame("some content", $page->getContentNl());
        $this->assertSame("some content", $page->getContent('nl'));
    }

    public function testSetPublicAvailable(): void
    {
        $page = new Page('Name of this page');
        $this->assertFalse($page->isPublicAvailable());

        $page->setPublicAvailable(true);
        $this->assertTrue($page->isPublicAvailable());
    }
}
