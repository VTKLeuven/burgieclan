<?php

namespace App\Tests\Api;

use App\Factory\CourseFactory;
use App\Factory\DocumentCategoryFactory;
use App\Factory\DocumentFactory;
use App\Factory\TagFactory;

class TagResourceTest extends ApiTestCase
{
    public function testGetCollectionOfTags(): void
    {
        TagFactory::createMany(5);
        $json = $this->browser()
            ->get(
                '/api/tags',
                [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->token
                    ]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 5)
            ->assertJsonMatches('length("hydra:member")', 5)
            ->json();

        $this->assertEqualsCanonicalizing(
            [
                '@id',
                '@type',
                'name',
                'createdAt',
                'updatedAt',
            ],
            array_keys($json->decoded()['hydra:member'][0])
        );
    }

    public function testGetOneTag(): void
    {
        $tag = TagFactory::createOne();

        $this->browser()
            ->get(
                '/api/tags/' . $tag->getId(),
                [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->token
                    ]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"@id"', '/api/tags/' . $tag->getId());
    }

    public function testGetTagsByCourseAndCategory(): void
    {
        // Create courses and categories
        $course1 = CourseFactory::createOne();
        $course2 = CourseFactory::createOne();

        $category1 = DocumentCategoryFactory::createOne();
        $category2 = DocumentCategoryFactory::createOne();

        $tag1 = TagFactory::createOne();
        $tag2 = TagFactory::createOne();
        $tag3 = TagFactory::createOne();
        $tag4 = TagFactory::createOne();

        // Create documents with different combinations of courses and categories
        $document1 = DocumentFactory::createOne(
            [
                'course' => $course1,
                'category' => $category1,
                'tags' => [$tag1, $tag2],
            ]
        );

        $document2 = DocumentFactory::createOne(
            [
                'course' => $course1,
                'category' => $category2,
                'tags' => [$tag2],
            ]
        );

        $document3 = DocumentFactory::createOne(
            [
                'course' => $course2,
                'category' => $category1,
                'tags' => [$tag2],
            ]
        );

        $document4 = DocumentFactory::createOne(
            [
                'course' => $course2,
                'category' => $category2,
                'tags' => [$tag3],
            ]
        );

        // Test filtering by course
        $this->browser()
            ->get(
                '/api/tags?course=/api/courses/' . $course1->getId(),
                [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->token
                    ]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 2) // tag1 and tag2 have documents with course1
            ->assertJsonMatches('length("hydra:member")', 2);

        // Test filtering by category
        $this->browser()
            ->get(
                '/api/tags?category=/api/document_categories/' . $category1->getId(),
                [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->token
                    ]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 2) // tag1 and tag2 have documents with category1
            ->assertJsonMatches('length("hydra:member")', 2);

        // Test filtering by both course and category
        $this->browser()
            ->get(
                '/api/tags?course=/api/courses/' . $course2->getId() . '&category=/api/document_categories/' . $category2->getId(),
                [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->token
                    ]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1) // Only tag3 has a document with both course2 and category2
            ->assertJsonMatches('length("hydra:member")', 1)
            ->assertJsonMatches('"hydra:member"[0].name', $tag3->getName());

        // Test with non-existent course
        $this->browser()
            ->get(
                '/api/tags?course=/api/courses/999',
                [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->token
                    ]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 0);

        // Test with no filter (should return all tags)
        $this->browser()
            ->get(
                '/api/tags',
                [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->token
                    ]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 4) // All tags
            ->assertJsonMatches('length("hydra:member")', 4);
    }

    public function testGetTagsWithInvalidToken(): void
    {
        TagFactory::createOne();
        $this->browser()
            ->get(
                '/api/tags',
                [
                    'headers' => [
                        'Authorization' => 'Bearer invalid_token_here'
                    ]
                ]
            )
            ->assertStatus(401)
            ->assertJsonMatches('"title"', 'An error occurred')
            ->assertJsonMatches('"detail"', 'Invalid JWT, please login again to get a new one.');
    }

    public function testCreateTag(): void
    {
        $tagData = [
            'name' => 'New Test Tag',
        ];

        $response = $this->browser()
            ->post(
                '/api/tags',
                [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->token,
                        'Content-Type' => 'application/ld+json'
                    ],
                    'json' => $tagData
                ]
            )
            ->assertStatus(201)
            ->assertJson()
            ->assertJsonMatches('"name"', 'New Test Tag');

        // Verify the tag was actually created
        $tagIRI = $response->json()->decoded()['@id'] ?? null;
        $this->assertNotNull($tagIRI);

        // Verify we can retrieve the created tag
        $this->browser()
            ->get(
                $tagIRI,
                [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->token
                    ]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"name"', 'New Test Tag');

        // We get the same tag when creating one with the same name
        $response = $this->browser()
            ->post(
                '/api/tags',
                [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->token,
                        'Content-Type' => 'application/ld+json'
                    ],
                    'json' => [
                        'name' => $tagData['name'],
                    ]
                ]
            )
            ->assertStatus(201)
            ->assertJson()
            ->assertJsonMatches('"name"', 'New Test Tag')
            ->assertJsonMatches('"@id"', $tagIRI);
    }

    public function testTagDoesNotExposeItsDocuments(): void
    {
        // A tag can be attached to tens of thousands of documents once the legacy
        // archive is imported, so TagApi never serializes them. Documents are
        // attached from the Document side and found through the collection filter.
        $tag = TagFactory::createOne(['name' => 'Tag With Documents']);
        $document1 = DocumentFactory::createOne(['tags' => [$tag]]);
        $document2 = DocumentFactory::createOne(['tags' => [$tag]]);

        $tagResponse = $this->browser()
            ->get(
                '/api/tags/' . $tag->getId(),
                [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->token
                    ]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"name"', 'Tag With Documents')
            ->json()->decoded();

        $this->assertArrayNotHasKey('documents', $tagResponse);

        // The supported direction: filter the documents collection by the tag.
        $filtered = $this->browser()
            ->get(
                '/api/documents?tags[]=/api/tags/' . $tag->getId(),
                [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->token
                    ]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->json()->decoded();

        $documentIRIs = array_map(
            fn($doc) => $doc['@id'],
            $filtered['member'] ?? $filtered['hydra:member'] ?? []
        );

        $this->assertContains('/api/documents/' . $document1->getId(), $documentIRIs);
        $this->assertContains('/api/documents/' . $document2->getId(), $documentIRIs);
    }

    public function testCreateTagWithoutAuthentication(): void
    {
        $tagData = [
            'name' => 'Unauthorized Tag',
        ];

        $this->browser()
            ->post(
                '/api/tags',
                [
                    'headers' => [
                        'Content-Type' => 'application/ld+json'
                    ],
                    'json' => $tagData
                ]
            )
            ->assertStatus(401);
    }

    public function testCreateTagWithMissingRequiredFields(): void
    {
        // name is required
        $tagData = [];

        $this->browser()
            ->post(
                '/api/tags',
                [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->token,
                        'Content-Type' => 'application/ld+json'
                    ],
                    'json' => $tagData
                ]
            )
            ->assertStatus(422) // Unprocessable Entity
            ->assertJson()
            ->assertJsonMatches('"hydra:description"', 'Tag name is required');
    }
}
