<?php

namespace App\Tests\Api;

use App\Factory\CommentCategoryFactory;
use Zenstruck\Foundry\Test\Factories;
use Zenstruck\Foundry\Test\ResetDatabase;

class CommentCategoryResourceTest extends ApiTestCase
{
    use ResetDatabase;
    use Factories;

    public function testGetCollectionOfCommentCategories(): void
    {
        CommentCategoryFactory::createMany(5);
        $json = $this->browser()->get('/api/comment_categories', ['headers' => ['Authorization' => 'Bearer ' . $this->token]])->assertStatus(200)->assertJson()->assertJsonMatches('"hydra:totalItems"', 5)->assertJsonMatches('length("hydra:member")', 5)->json();

        $this->assertSame(array_keys($json->decoded()['hydra:member'][0]), ['@id', '@type', 'name', 'description',]);
    }

    public function testGetOneCommentCategory(): void
    {
        $category = CommentCategoryFactory::createOne();

        $this->browser()->get('/api/comment_categories/' . $category->getId(), ['headers' => ['Authorization' => 'Bearer ' . $this->token]])->assertStatus(200)->assertJson()->assertJsonMatches('"@id"', '/api/comment_categories/' . $category->getId());
    }

    public function testGetCommentCategoryFilterByName(): void
    {
        $category1 = CommentCategoryFactory::createOne(['name_nl' => 'category1',]);

        $category2 = CommentCategoryFactory::createOne(['name_nl' => 'category2',]);

        $category3 = CommentCategoryFactory::createOne(['name_nl' => 'category3',]);

        CommentCategoryFactory::createMany(5);

        $this->browser()->get('/api/comment_categories?name=category2', ['headers' => ['Authorization' => 'Bearer ' . $this->token]])->assertStatus(200)->assertJson()->assertJsonMatches('"hydra:totalItems"', 1)->assertJsonMatches('length("hydra:member")', 1)->get('/api/comment_categories?name=category', ['headers' => ['Authorization' => 'Bearer ' . $this->token]])->assertJson()->assertJsonMatches('"hydra:totalItems"', 3)->assertJsonMatches('length("hydra:member")', 3);
    }

    public function testGetCommentCategoryFilterByDescription(): void
    {
        $category1 = CommentCategoryFactory::createOne(['description_nl' => 'description1',]);

        $category2 = CommentCategoryFactory::createOne(['description_nl' => 'description2',]);

        $category3 = CommentCategoryFactory::createOne(['description_nl' => 'description3',]);

        CommentCategoryFactory::createMany(5);

        $this->browser()
            ->get('/api/comment_categories?description=description2', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
            ->get('/api/comment_categories?description=description', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3);
    }

    public function testGetCommentCategoryFilterByNameEn(): void
    {
        $category1 = CommentCategoryFactory::createOne(['name_en' => 'english1',]);
        $category2 = CommentCategoryFactory::createOne(['name_en' => 'english2',]);
        $category3 = CommentCategoryFactory::createOne(['name_en' => 'english3',]);
        CommentCategoryFactory::createMany(5);

        $this->browser()
            ->get('/api/comment_categories?name=english2', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
            ->get('/api/comment_categories?name=english', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3);
    }

    public function testGetCommentCategoryFilterByDescriptionEn(): void
    {
        $category1 = CommentCategoryFactory::createOne(['description_en' => 'desc1',]);
        $category2 = CommentCategoryFactory::createOne(['description_en' => 'desc2',]);
        $category3 = CommentCategoryFactory::createOne(['description_en' => 'desc3',]);
        CommentCategoryFactory::createMany(5);

        $this->browser()
            ->get('/api/comment_categories?description=desc2', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
            ->get('/api/comment_categories?description=desc', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3);
    }

    public function testGetCommentCategoryFilterByNameMixedLanguages(): void
    {
        $category1 = CommentCategoryFactory::createOne(['name_nl' => 'mixnl', 'name_en' => 'mixen']);
        $category2 = CommentCategoryFactory::createOne(['name_nl' => 'mixnl2', 'name_en' => 'mixen2']);
        $category3 = CommentCategoryFactory::createOne(['name_nl' => 'othernl', 'name_en' => 'otheren']);
        CommentCategoryFactory::createMany(5);

        // Should match both nl and en, and partials
        $this->browser()
            ->get('/api/comment_categories?name=mixnl', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 2)
            ->assertJsonMatches('length("hydra:member")', 2)
            ->get('/api/comment_categories?name=mixen2', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
            ->get('/api/comment_categories?name=mix', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 2)
            ->assertJsonMatches('length("hydra:member")', 2);
    }

    public function testGetCommentCategoryFilterByDescriptionMixedLanguages(): void
    {
        $category1 = CommentCategoryFactory::createOne(['description_nl' => 'descNL', 'description_en' => 'descEN']);
        $category2 = CommentCategoryFactory::createOne(['description_nl' => 'descNL2', 'description_en' => 'descEN2']);
        $category3 = CommentCategoryFactory::createOne(['description_nl' => 'otherNL', 'description_en' => 'otherEN']);
        CommentCategoryFactory::createMany(5);

        $this->browser()
            ->get('/api/comment_categories?description=descNL', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 2)
            ->assertJsonMatches('length("hydra:member")', 2)
            ->get('/api/comment_categories?description=descEN2', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
            ->get('/api/comment_categories?description=desc', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 2)
            ->assertJsonMatches('length("hydra:member")', 2);
    }
}
