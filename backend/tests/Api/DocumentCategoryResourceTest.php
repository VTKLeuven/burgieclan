<?php

namespace App\Tests\Api;

use App\Factory\DocumentCategoryFactory;
use Zenstruck\Foundry\Test\Factories;
use Zenstruck\Foundry\Test\ResetDatabase;

class DocumentCategoryResourceTest extends ApiTestCase
{
    use ResetDatabase;
    use Factories;

    public function testGetCollectionOfDocumentCategories(): void
    {
        DocumentCategoryFactory::createMany(5);
        $json = $this->browser()
            ->get('/api/document_categories')
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 5)
            ->assertJsonMatches('length("hydra:member")', 5)
            ->json()
        ;

        $this->assertSame(array_keys($json->decoded()['hydra:member'][0]), [
            '@id',
            '@type',
            'name',
        ]);
    }

    public function testGetOneDocumentCategory(): void
    {
        $category = DocumentCategoryFactory::createOne();

        $this->browser()
            ->get('/api/document_categories/'.$category->getId())
            ->assertJson()
            ->assertJsonMatches('"@id"', '/api/document_categories/'.$category->getId());
    }

    public function testGetDocumentCategoryFilterByName(): void
    {
        $category1 = DocumentCategoryFactory::createOne([
            'name' => 'category1',
        ]);

        $category2 = DocumentCategoryFactory::createOne([
            'name' => 'category2',
        ]);

        $category3 = DocumentCategoryFactory::createOne([
            'name' => 'category3',
        ]);

        DocumentCategoryFactory::createMany(5);

        $this->browser()
            ->get('/api/document_categories?name=category2')
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
            ->get('/api/document_categories?name=category')
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3)
        ;
    }
}