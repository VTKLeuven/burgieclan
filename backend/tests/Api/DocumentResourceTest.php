<?php

namespace App\Tests\Api;

use App\Factory\CourseFactory;
use App\Factory\DocumentCategoryFactory;
use App\Factory\DocumentFactory;
use App\Factory\UserFactory;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Zenstruck\Foundry\Test\Factories;
use Zenstruck\Foundry\Test\ResetDatabase;

class DocumentResourceTest extends ApiTestCase
{
    use ResetDatabase;
    use Factories;

    public function testGetCollectionOfDocuments(): void
    {
        DocumentFactory::createMany(5, [
            'anonymous' => false,
        ]);
        $json = $this->browser()
            ->get('/api/documents', [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
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
            'year',
            'under_review',
            'anonymous',
            'contentUrl',
            'creator',
            'createdAt',
            'updatedAt',
        ]);
    }

    public function testGetCollectionOfAnonymousDocuments(): void
    {
        DocumentFactory::createMany(5, [
            'anonymous' => true,
        ]);
        $json = $this->browser()
            ->get('/api/documents', [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
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
            'year',
            'under_review',
            'anonymous',
            'contentUrl',
            'createdAt',
            'updatedAt',
        ]); // Notice that creator is not included in the response.
    }

    public function testGetOneDocument(): void
    {
        $document = DocumentFactory::createOne(
            [
                'anonymous' => false,
            ]
        );

        $this->browser()
            ->get('/api/documents/' . $document->getId(), [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"@id"', '/api/documents/' . $document->getId())
            ->assertJsonMatches('anonymous', false)
            ->assertJsonMatches('creator', '/api/users/' . $document->getCreator()->getId());
    }

    public function testGetOneAnonymousDocument(): void
    {
        $document = DocumentFactory::createOne(
            [
                'anonymous' => true,
            ]
        );

        $this->browser()
            ->get('/api/documents/' . $document->getId(), [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"@id"', '/api/documents/' . $document->getId())
            ->assertJsonMatches('anonymous', true)
            ->assertJsonMatches('creator', null);
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
            ->get('/api/documents?name=document2', [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
            ->get('/api/documents?name=document', [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
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
            ->get('/api/documents?under_review=true', [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3)
            ->get('/api/documents?under_review=false', [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 5)
            ->assertJsonMatches('length("hydra:member")', 5)
        ;
    }

    public function testGetDocumentFilterByCourse(): void
    {
        $course1 = CourseFactory::createOne();
        $course2 = CourseFactory::createOne();
        DocumentFactory::createMany(1, [
            'course' => $course1,
        ]);
        DocumentFactory::createMany(2, [
            'course' => $course2,
        ]);
        DocumentFactory::createMany(5, [
            'course' => CourseFactory::createOne(),
        ]);

        $this->browser()
            ->get('/api/documents?course=/api/courses/' . $course1->getId(), [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
            ->get('/api/documents?course[]=/api/courses/' . $course1->getId() .
                '&course[]=/api/courses/' . $course2->getId(), [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3)
            ->get('/api/documents', [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 8)
            ->assertJsonMatches('length("hydra:member")', 8)
        ;
    }

    public function testGetDocumentFilterByCategory(): void
    {
        $category1 = DocumentCategoryFactory::createOne();
        $category2 = DocumentCategoryFactory::createOne();
        DocumentFactory::createMany(1, [
            'category' => $category1,
        ]);
        DocumentFactory::createMany(2, [
            'category' => $category2,
        ]);
        DocumentFactory::createMany(5, [
            'category' => DocumentCategoryFactory::createOne(),
        ]);

        $this->browser()
            ->get('/api/documents?category=/api/document_categories/' . $category1->getId(), [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
            ->get('/api/documents?category[]=/api/document_categories/' . $category1->getId() .
                '&category[]=/api/document_categories/' . $category2->getId(), [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3)
            ->get('/api/documents', [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 8)
            ->assertJsonMatches('length("hydra:member")', 8)
        ;
    }

    public function testGetDocumentFilterByCreator(): void
    {
        $user1 = UserFactory::createOne();
        $user2 = UserFactory::createOne();
        DocumentFactory::createMany(1, [
            'creator' => $user1,
        ]);
        DocumentFactory::createMany(2, [
            'creator' => $user2,
        ]);
        DocumentFactory::createMany(5, [
            'creator' => UserFactory::createOne(),
        ]);

        $this->browser()
            ->get('/api/documents?creator=/api/users/' . $user1->getId(), [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
            ->get('/api/documents?creator[]=/api/users/' . $user1->getId() .
                '&creator[]=/api/users/' . $user2->getId(), [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3)
            ->get('/api/documents', [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 8)
            ->assertJsonMatches('length("hydra:member")', 8)
        ;
    }

    public function testGetDocumentFilterByYear(): void
    {
        DocumentFactory::createMany(1, [
            'year' => '2024 - 2025',
        ]);
        DocumentFactory::createMany(1, [
            'year' => '2025 - 2026',
        ]);
        DocumentFactory::createMany(5, [
            'year' => '2026 - 2027',
        ]);

        $this->browser()
            ->get('/api/documents?year=2024 - 2025', [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
            ->get('/api/documents?year=24', [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
            ->get('/api/documents?year=25', [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 2)
            ->assertJsonMatches('length("hydra:member")', 2)
            ->get('/api/documents?year=26', [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 6)
            ->assertJsonMatches('length("hydra:member")', 6)
        ;
    }

    public function testPostToCreateDocument(): void
    {
        $course = CourseFactory::createOne();
        $category = DocumentCategoryFactory::createOne();

        // Create copy of file in system tmp directory
        $filePath = tempnam(sys_get_temp_dir(), uniqid());
        $img = file_get_contents(__DIR__ . '/../../public/image-for-test.png');
        file_put_contents($filePath, $img);
        $file = new UploadedFile($filePath, 'image-for-test.png');

        $json = $this->browser()
            ->post('/api/documents', [
                'headers' => [
                    'Content-Type' => 'multipart/form-data',
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(400)
            ->post('/api/documents', [
                'headers' => [
                    'Content-Type' => 'multipart/form-data',
                    'Authorization' => 'Bearer ' . $this->token
                ],
                'body' => [
                    'name' => 'Document name',
                    'course' => '/api/courses/' . $course->getId(),
                    'category' => '/api/document_categories/' . $category->getId(),
                    'anonymous' => true,
                ],
                'files' => [
                    'file' => $file,
                ],
            ])
            ->assertStatus(201)
            ->assertJsonMatches('name', 'Document name')
            ->json();

        $contentUrl = $json->decoded()['contentUrl'];
        $array = explode('/', $contentUrl);
        $filename = end($array);
        // Delete saved file to clean up.
        unlink(__DIR__ . '/../../data/documents/' . $filename);
    }

    /**
     * Test that an anonymous document does not have a creator field in the GET-response
     * (it should always have one just when GET is called when anonymous, it should give
     * no creator field (deleted inside DocumentApiProvider)).
     */
    public function testAnonymousDocumentDoesNotHaveCreator(): void
    {
        $document = DocumentFactory::createOne([
            'anonymous' => true,
            'creator' => UserFactory::createOne(),
        ]);

        $json = $this->browser()
            ->get('/api/documents/' . $document->getId(), [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"@id"', '/api/documents/' . $document->getId())
            ->json();

        $this->assertArrayNotHasKey('creator', $json->decoded());

        // Check that if the creator is set to non-anonymous later on, the creator is given in the GET-response.
        $document->setAnonymous(false);
        $document->_save();

        $json = $this->browser()
            ->get('/api/documents/' . $document->getId(), [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"@id"', '/api/documents/' . $document->getId())
            ->json();

        $this->assertArrayHasKey('creator', $json->decoded());
    }

    /**
     * Test that a non-anonymous document has a creator field in the GET-response.
     */
    public function testNonAnonymousDocumentHasCreator(): void
    {
        $document = DocumentFactory::createOne([
            'anonymous' => false
        ]);

        $json = $this->browser()
            ->get('/api/documents/' . $document->getId(), [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"@id"', '/api/documents/' . $document->getId())
            ->json();

        $this->assertArrayHasKey('creator', $json->decoded());

        // Check that if the creator is set to anonymous later on, no creator field is given on GET.
        $document->setAnonymous(true);
        $document->_save();

        $json = $this->browser()
            ->get('/api/documents/' . $document->getId(), [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"@id"', '/api/documents/' . $document->getId())
            ->json();

        $this->assertArrayNotHasKey('creator', $json->decoded());
    }

}