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
            ->get('/api/document_categories', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 5)
            ->assertJsonMatches('length("hydra:member")', 5)
            ->json();

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
            ->get('/api/document_categories/' . $category->getId(), [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"@id"', '/api/document_categories/' . $category->getId());
    }

    public function testGetDocumentCategoryFilterByName(): void
    {
        $category1 = DocumentCategoryFactory::createOne([
            'name_nl' => 'category1',
        ]);

        $category2 = DocumentCategoryFactory::createOne([
            'name_nl' => 'category2',
        ]);

        $category3 = DocumentCategoryFactory::createOne([
            'name_nl' => 'category3',
        ]);

        DocumentCategoryFactory::createMany(5);

        $this->browser()
            ->get('/api/document_categories?name=category2', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
            ->get('/api/document_categories?name=category', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3);
    }

    public function testGetDocumentCategoryFilterByNameNl(): void
    {
        $category1 = DocumentCategoryFactory::createOne(['name_nl' => 'dutch1']);
        $category2 = DocumentCategoryFactory::createOne(['name_nl' => 'dutch2']);
        $category3 = DocumentCategoryFactory::createOne(['name_nl' => 'dutch3']);
        DocumentCategoryFactory::createMany(5);

        $this->browser()
            ->get('/api/document_categories?name=dutch2', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
            ->get('/api/document_categories?name=dutch', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3);
    }

    public function testGetDocumentCategoryFilterByNameEn(): void
    {
        $category1 = DocumentCategoryFactory::createOne(['name_en' => 'english1']);
        $category2 = DocumentCategoryFactory::createOne(['name_en' => 'english2']);
        $category3 = DocumentCategoryFactory::createOne(['name_en' => 'english3']);
        DocumentCategoryFactory::createMany(5);

        $this->browser()
            ->get('/api/document_categories?name=english2', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
            ->get('/api/document_categories?name=english', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3);
    }

    public function testGetDocumentCategoryFilterByNameMixedLanguages(): void
    {
        $category1 = DocumentCategoryFactory::createOne(['name_nl' => 'mixnl', 'name_en' => 'mixen']);
        $category2 = DocumentCategoryFactory::createOne(['name_nl' => 'mixnl2', 'name_en' => 'mixen2']);
        $category3 = DocumentCategoryFactory::createOne(['name_nl' => 'othernl', 'name_en' => 'otheren']);
        DocumentCategoryFactory::createMany(5);

        // Should match both nl and en, and partials
        $this->browser()
            ->get('/api/document_categories?name=mixnl', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 2)
            ->assertJsonMatches('length("hydra:member")', 2)
            ->get('/api/document_categories?name=mixen2', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
            ->get('/api/document_categories?name=mix', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 2)
            ->assertJsonMatches('length("hydra:member")', 2);
    }
}