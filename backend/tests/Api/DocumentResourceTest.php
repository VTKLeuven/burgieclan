<?php

namespace App\Tests\Api;

use App\Factory\CourseFactory;
use App\Factory\DocumentCategoryFactory;
use App\Factory\DocumentFactory;
use App\Factory\UserFactory;
use Zenstruck\Browser\HttpOptions;
use Zenstruck\Foundry\Test\Factories;
use Zenstruck\Foundry\Test\ResetDatabase;

class DocumentResourceTest extends ApiTestCase
{
    use ResetDatabase;
    use Factories;

    public function testGetCollectionOfDocuments(): void
    {
        DocumentFactory::createMany(5);
        $json = $this->browser()
            ->get('/api/documents')
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 5)
            ->assertJsonMatches('length("hydra:member")', 5)
            ->json()
        ;

        $this->assertSame(array_keys($json->decoded()['hydra:member'][0]), [
            '@id',
            '@type',
            'name',
            'course',
            'category',
            'under_review',
            'creator',
            'createdAt',
            'updatedAt',
        ]);
    }

    public function testGetOneDocument(): void
    {
        $comment = DocumentFactory::createOne();

        $this->browser()
            ->get('/api/documents/'.$comment->getId())
            ->assertJson()
            ->assertJsonMatches('"@id"', '/api/documents/'.$comment->getId());
    }

    public function testGetDocumentFilterByName(): void
    {
        $document1 = DocumentFactory::createOne([
            'name' => 'document1',
        ]);

        $document2 = DocumentFactory::createOne([
            'name' => 'document2',
        ]);

        $document3 = DocumentFactory::createOne([
            'name' => 'document3',
        ]);

        DocumentFactory::createMany(5);

        $this->browser()
            ->get('/api/documents?name=document2')
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
            ->get('/api/documents?name=document')
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3)
        ;
    }

    public function testGetDocumentFilterByUnderReview(): void
    {
        DocumentFactory::createMany(3, [
            'under_review' => true,
        ]);
        DocumentFactory::createMany(5, [
            'under_review' => false,
        ]);

        $this->browser()
            ->get('/api/documents?under_review=true')
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3)
            ->get('/api/documents?under_review=false')
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 5)
            ->assertJsonMatches('length("hydra:member")', 5)
        ;
    }

    public function testPostToCreateDocument(): void
    {
        $user = UserFactory::createOne();
        $course = CourseFactory::createOne();
        $category = DocumentCategoryFactory::createOne();

        $this->browser()
            ->actingAs($user)
            ->post('/api/documents', [
                'json' => [],
                'headers' => [
                    'Content-Type' => 'application/ld+json',
                ],
            ])
            ->assertStatus(422)
            ->post('/api/documents', HttpOptions::json([
                'name' => 'Document name',
                'course' => '/api/courses/' . $course->getId(),
                'category' => '/api/document_categories/' . $category->getId(),
                'under_review' => true,
            ]))
            ->assertStatus(201)
            ->assertJsonMatches('name', 'Document name')
        ;
    }
}