<?php

namespace Api;

use App\Factory\CommentCategoryFactory;
use App\Tests\Api\ApiTestCase;
use Zenstruck\Foundry\Test\Factories;
use Zenstruck\Foundry\Test\ResetDatabase;

class CommentCategoryResourceTest extends ApiTestCase
{
    use ResetDatabase;
    use Factories;

    public function testGetCollectionOfCommentCategories(): void
    {
        CommentCategoryFactory::createMany(5);
        $json = $this->browser()
            ->get('/api/comment_categories')
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 5)
            ->assertJsonMatches('length("hydra:member")', 5)
            ->json()
        ;

        $this->assertSame(array_keys($json->decoded()['hydra:member'][0]), [
            '@id',
            '@type',
            'name',
            'description',
        ]);
    }

    public function testGetOneCommentCategory(): void
    {
        $category = CommentCategoryFactory::createOne();

        $this->browser()
            ->get('/api/comment_categories/'.$category->getId())
            ->assertJson()
            ->assertJsonMatches('"@id"', '/api/comment_categories/'.$category->getId());
    }

    public function testGetCommentCategoryFilterByName(): void
    {
        $category1 = CommentCategoryFactory::createOne([
            'name' => 'category1',
        ]);

        $category2 = CommentCategoryFactory::createOne([
            'name' => 'category2',
        ]);

        $category3 = CommentCategoryFactory::createOne([
            'name' => 'category3',
        ]);

        CommentCategoryFactory::createMany(5);

        $this->browser()
            ->get('/api/comment_categories?name=category2')
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
            ->get('/api/comment_categories?name=category')
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3)
        ;
    }

    public function testGetCommentCategoryFilterByDescription(): void
    {
        $category1 = CommentCategoryFactory::createOne([
            'description' => 'description1',
        ]);

        $category2 = CommentCategoryFactory::createOne([
            'description' => 'description2',
        ]);

        $category3 = CommentCategoryFactory::createOne([
            'description' => 'description3',
        ]);

        CommentCategoryFactory::createMany(5);

        $this->browser()
            ->get('/api/comment_categories?description=description2')
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
            ->get('/api/comment_categories?description=description')
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3)
        ;
    }
}