<?php

namespace App\Tests\Entity;

use App\Entity\DocumentCategory;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;


class DocumentCategoryTest extends KernelTestCase
{
    public function testSetParent(): void
    {
        $parent = new DocumentCategory();
        $parent->setName('Parent');

        $child = new DocumentCategory();
        $child->setName('Child');
        $child->setParent($parent);

        $this->assertSame($parent, $child->getParent());
        $this->assertContains($child, $parent->getSubcategories());
    }

    public function testToString(): void
    {
        $parent = new DocumentCategory();
        $parent->setName('Parent Category');

        $child = new DocumentCategory();
        $child->setName('Child Category');
        $child->setParent($parent);

        $this->assertSame('Parent Category > Child Category', (string)$child);
        $this->assertSame('Parent Category', (string)$parent);
    }
}