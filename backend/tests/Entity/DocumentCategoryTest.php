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

    public function testAddDocument()
    {
        $category = new DocumentCategory();
        $document = new Document();
        $document->setName('Test Document');

        $category->addDocument($document);

        $this->assertCount(1, $category->getDocuments());
        $this->assertSame($document, $category->getDocuments()->first());
        $this->assertSame($category, $document->getCategory());
    }

    public function testRemoveDocument()
    {
        $category = new DocumentCategory();
        $document = new Document();
        $document->setName('Test Document');

        $category->addDocument($document);
        $category->removeDocument($document);

        $this->assertCount(0, $category->getDocuments());
        $this->assertNull($document->getCategory());
    }
}