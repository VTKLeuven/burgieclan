<?php

namespace App\Tests\Api;

use App\Factory\CourseFactory;
use App\Factory\DocumentCategoryFactory;
use App\Factory\DocumentFactory;
use App\Factory\TagFactory;
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
            'course',
            'category',
            'year',
            'under_review',
            'anonymous',
            'contentUrl',
            'mimetype',
            'filename',
            'creator',
            'fileSize',
            'createdAt',
            'updatedAt',
            'tags',
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
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 5)
            ->assertJsonMatches('length("hydra:member")', 5)
            ->json();$this->assertSame(array_keys($json->decoded()['hydra:member'][0]), [
            '@id',
            '@type',
            'name',
            'course',
            'category',
            'year',
            'under_review',
            'anonymous',
            'contentUrl',
            'mimetype',
            'filename',
            'createdAt',
            'fileSize',
            'updatedAt',
            'tags',
        ]); // Notice that creator is not included in the response.

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
            'mimetype',
            'filename',
            'fileSize',
            'createdAt',
            'updatedAt',
            'tags',
        ]);
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
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"@id"', '/api/documents/' . $document->getId())
            ->assertJsonMatches('anonymous', false);
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
                    'Authorization' => 'Bearer ' . $this->token
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
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
            ->get('/api/documents?name=document', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3);
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
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3)
            ->get('/api/documents?under_review=false', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 5)
            ->assertJsonMatches('length("hydra:member")', 5);
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
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
            ->get('/api/documents?course[]=/api/courses/' . $course1->getId() .
                '&course[]=/api/courses/' . $course2->getId(), [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3)
            ->get('/api/documents', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 8)
            ->assertJsonMatches('length("hydra:member")', 8);
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
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
            ->get('/api/documents?category[]=/api/document_categories/' . $category1->getId() .
                '&category[]=/api/document_categories/' . $category2->getId(), [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3)
            ->get('/api/documents', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 8)
            ->assertJsonMatches('length("hydra:member")', 8);
    }

    public function testGetDocumentFilterByCreator(): void
    {
        $user1 = UserFactory::createOne();
        $user2 = UserFactory::createOne();
        DocumentFactory::createMany(1, [
            'creator' => $user1,
            'under_review' => false, // Only non-under-review documents are returned (except if the user is the creator)
        ]);
        DocumentFactory::createMany(2, [
            'creator' => $user2,
            'under_review' => false,
        ]);
        DocumentFactory::createMany(5, [
            'creator' => UserFactory::createOne(),
            'under_review' => false,
        ]);

        $this->browser()
            ->get('/api/documents?creator=/api/users/' . $user1->getId(), [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
            ->get('/api/documents?creator[]=/api/users/' . $user1->getId() .
                '&creator[]=/api/users/' . $user2->getId(), [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3)
            ->get('/api/documents', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 8)
            ->assertJsonMatches('length("hydra:member")', 8);
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
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
            ->get('/api/documents?year=24', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
            ->get('/api/documents?year=25', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 2)
            ->assertJsonMatches('length("hydra:member")', 2)
            ->get('/api/documents?year=26', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 6)
            ->assertJsonMatches('length("hydra:member")', 6);
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
                    'under_review' => true,
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

    public function testGetDocumentReturnsCorrectMimeType(): void
    {
        // Create a temporary file with minimal PDF content
        $tempFile = tempnam(sys_get_temp_dir(), 'test_') . '.pdf';
        $pdfContent = "%PDF-1.7\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF";
        file_put_contents($tempFile, $pdfContent);

        // Create an actual uploaded file
        $uploadedFile = new UploadedFile(
            $tempFile,
            'test.pdf',
            'application/pdf',
            null,
            true
        );

        // Create document through normal upload process
        $document = DocumentFactory::new()->withoutPersisting()->create();
        $document->setFile($uploadedFile);
        $document->_save();

        $this->browser()
            ->get('/api/documents/' . $document->getId(), [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('mimetype', 'application/pdf');

        // Safe cleanup of temp file
        if (file_exists($tempFile)) {
            unlink($tempFile);
        }

        // Also cleanup the uploaded file from the data/documents directory
        $filename = $document->getFileName();
        if ($filename) {
            $uploadedPath = __DIR__ . '/../../data/documents/' . $filename;
            if (file_exists($uploadedPath)) {
                unlink($uploadedPath);
            }
        }
    }

    public function testGetCollectionReturnsCorrectMimeTypes(): void
    {
        // Create temp files
        $pdfTempFile = tempnam(sys_get_temp_dir(), 'test_') . '.pdf';
        $txtTempFile = tempnam(sys_get_temp_dir(), 'test_') . '.txt';

        // Create minimal valid PDF content
        $pdfContent = "%PDF-1.7\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF";
        file_put_contents($pdfTempFile, $pdfContent);
        file_put_contents($txtTempFile, 'Text content');

        // Create actual uploaded files
        $pdfFile = new UploadedFile(
            $pdfTempFile,
            'document.pdf',
            'application/pdf',
            null,
            true
        );

        $txtFile = new UploadedFile(
            $txtTempFile,
            'notes.txt',
            'text/plain',
            null,
            true
        );

        // Create documents with actual files
        $pdfDocument = DocumentFactory::new()->withoutPersisting()->create();
        $pdfDocument->setFile($pdfFile);
        $pdfDocument->_save();

        $txtDocument = DocumentFactory::new()->withoutPersisting()->create();
        $txtDocument->setFile($txtFile);
        $pdfDocument->_save();

        $json = $this->browser()
            ->get('/api/documents', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->json();

        $documents = $json->decoded()['hydra:member'];

        // Find our test documents
        $pdfResponse = null;
        $txtResponse = null;
        foreach ($documents as $doc) {
            if ($doc['@id'] === '/api/documents/' . $pdfDocument->getId()) {
                $pdfResponse = $doc;
            }
            if ($doc['@id'] === '/api/documents/' . $txtDocument->getId()) {
                $txtResponse = $doc;
            }
        }

        // Assert mime types
        $this->assertNotNull($pdfResponse, 'PDF document not found in collection');
        $this->assertNotNull($txtResponse, 'Text document not found in collection');
        $this->assertEquals('application/pdf', $pdfResponse['mimetype']);
        $this->assertEquals('text/plain', $txtResponse['mimetype']);

        // Safe cleanup of temp files
        if (file_exists($pdfTempFile)) {
            unlink($pdfTempFile);
        }
        if (file_exists($txtTempFile)) {
            unlink($txtTempFile);
        }

        // Cleanup uploaded files from the data/documents directory
        foreach ($documents as $doc) {
            if (!empty($doc['filename'])) {
                $uploadedPath = __DIR__ . '/../../data/documents/' . $doc['filename'];
                if (file_exists($uploadedPath)) {
                    unlink($uploadedPath);
                }
            }
        }
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
                    'Authorization' => 'Bearer ' . $this->token
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
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"@id"', '/api/documents/' . $document->getId())
            ->json();

        $this->assertArrayNotHasKey('creator', $json->decoded());
    }

    public function testGetDocumentFilterByTags(): void
    {
        // Create specific tags we can reference later
        $tagPython = TagFactory::createOne(['name' => 'python']);
        $tagJavascript = TagFactory::createOne(['name' => 'javascript']);
        $tagPHP = TagFactory::createOne(['name' => 'php']);

        // Create documents with different tag combinations
        DocumentFactory::createOne([
            'tags' => [$tagPython],
            'under_review' => false,
        ]);

        DocumentFactory::createOne([
            'tags' => [$tagJavascript],
            'under_review' => false,
        ]);

        DocumentFactory::createOne([
            'tags' => [$tagPHP],
            'under_review' => false,
        ]);

        DocumentFactory::createOne([
            'tags' => [$tagPython, $tagJavascript],
            'under_review' => false,
        ]);

        DocumentFactory::createOne([
            'tags' => [$tagJavascript, $tagPHP, $tagPython],
            'under_review' => false,
        ]);

        // Create documents without tags
        DocumentFactory::createMany(3, [
            'tags' => [],
            'under_review' => false,
        ]);

        // Test filtering by single tag name (exact match)
        $this->browser()
            ->get('/api/documents?tags.name=python', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3);

        // Test filtering by partial tag name (using ipartial strategy)
        $this->browser()
            ->get('/api/documents?tags.name=py', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3);

        // Test filtering by multiple tag names
        $this->browser()
            ->get('/api/documents?tags.name[]=python&tags.name[]=javascript', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 2)
            ->assertJsonMatches('length("hydra:member")', 2);

        // Test filtering by tag IRI
        $this->browser()
            ->get('/api/documents?tags=/api/tags/' . $tagPHP->getId(), [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 2)
            ->assertJsonMatches('length("hydra:member")', 2);

        // Test filtering by multiple tag IRIs
        $this->browser()
            ->get('/api/documents?tags[]=/api/tags/' . $tagPython->getId() .
                '&tags[]=/api/tags/' . $tagPHP->getId(), [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1);

        // Verify total count without filters
        $this->browser()
            ->get('/api/documents', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 8)
            ->assertJsonMatches('length("hydra:member")', 8);
    }

    public function testCreateDocumentWithTags(): void
    {
        $course = CourseFactory::createOne();
        $category = DocumentCategoryFactory::createOne();

        $existingTag = TagFactory::createOne(['name' => 'Existing Tag']);

        // Create copy of file in system tmp directory
        $filePath = tempnam(sys_get_temp_dir(), uniqid());
        $img = file_get_contents(__DIR__ . '/../../public/image-for-test.png');
        file_put_contents($filePath, $img);
        $file = new UploadedFile($filePath, 'image-for-test.png');

        // Create document with tags
        $json = $this->browser()
            ->post('/api/documents', [
                'headers' => [
                    'Content-Type' => 'multipart/form-data',
                    'Authorization' => 'Bearer ' . $this->token
                ],
                'body' => [
                    'name' => 'Document with tags',
                    'course' => '/api/courses/' . $course->getId(),
                    'category' => '/api/document_categories/' . $category->getId(),
                    'anonymous' => false,
                    'tags' => ['/api/tags/' . $existingTag->getId()],
                ],
                'files' => [
                    'file' => $file,
                ],
            ])
            ->assertStatus(201)
            ->assertJsonMatches('name', 'Document with tags')
            ->assertJsonMatches('length("tags")', 1)
            ->json()->decoded();

        $documentIRI = $json['@id'];

        // Verify the tag association in the document
        $response = $this->browser()
            ->get($documentIRI, [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->json()->decoded();

        $tagIRIs = array_map(function ($tag) {
            return $tag['@id'];
        }, $response['tags']);
        $this->assertContains('/api/tags/' . $existingTag->getId(), $tagIRIs);

        // Also verify from the tag side
        $tagResponse = $this->browser()
            ->get('/api/tags/' . $existingTag->getId(), [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->json()->decoded();

        $this->assertContains($documentIRI, $tagResponse['documents']);

        // Clean up the file
        $contentUrl = $json['contentUrl'];
        $array = explode('/', $contentUrl);
        $filename = end($array);
        unlink(__DIR__ . '/../../data/documents/' . $filename);
    }

    public function testCreateDocumentWithMultipleTags(): void
    {
        $course = CourseFactory::createOne();
        $category = DocumentCategoryFactory::createOne();

        $tag1 = TagFactory::createOne(['name' => 'Tag One']);
        $tag2 = TagFactory::createOne(['name' => 'Tag Two']);

        // Create copy of file in system tmp directory
        $filePath = tempnam(sys_get_temp_dir(), uniqid());
        $img = file_get_contents(__DIR__ . '/../../public/image-for-test.png');
        file_put_contents($filePath, $img);
        $file = new UploadedFile($filePath, 'image-for-test.png');

        // Create document with multiple tags
        $json = $this->browser()
            ->post('/api/documents', [
                'headers' => [
                    'Content-Type' => 'multipart/form-data',
                    'Authorization' => 'Bearer ' . $this->token
                ],
                'body' => [
                    'name' => 'Document with multiple tags',
                    'course' => '/api/courses/' . $course->getId(),
                    'category' => '/api/document_categories/' . $category->getId(),
                    'anonymous' => false,
                    // Use array of tags
                    'tags' => [
                        '/api/tags/' . $tag1->getId(),
                        '/api/tags/' . $tag2->getId()
                    ],
                ],
                'files' => [
                    'file' => $file,
                ],
            ])
            ->assertStatus(201)
            ->assertJsonMatches('name', 'Document with multiple tags')
            ->assertJsonMatches('length("tags")', 2)
            ->json()->decoded();

        $documentIRI = $json['@id'];

        // Verify the tag associations in the document
        $response = $this->browser()
            ->get($documentIRI, [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->json()->decoded();

        $tagIRIs = array_map(function ($tag) {
            return $tag['@id'];
        }, $response['tags']);

        $this->assertContains('/api/tags/' . $tag1->getId(), $tagIRIs);
        $this->assertContains('/api/tags/' . $tag2->getId(), $tagIRIs);

        // Clean up the file
        $contentUrl = $json['contentUrl'];
        $array = explode('/', $contentUrl);
        $filename = end($array);
        unlink(__DIR__ . '/../../data/documents/' . $filename);
    }
}
