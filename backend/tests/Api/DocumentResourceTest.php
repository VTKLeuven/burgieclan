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
        DocumentFactory::createMany(5);
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
            'creator',
            'createdAt',
            'updatedAt',
        ]);
    }

    public function testGetOneDocument(): void
    {
        $comment = DocumentFactory::createOne();

        $this->browser()
            ->get('/api/documents/' . $comment->getId(), [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"@id"', '/api/documents/' . $comment->getId());
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
            'year' => '24-25',
        ]);
        DocumentFactory::createMany(1, [
            'year' => '25-26',
        ]);
        DocumentFactory::createMany(5, [
            'year' => '26-27',
        ]);

        $this->browser()
            ->get('/api/documents?year=24-25', [
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
            ->json();

        $this->assertArrayNotHasKey('creator', $json->decoded());
    }

    public function testNonAnonymousDocumentHasCreator(): void
    {
        $document = DocumentFactory::createOne();
        $document->setAnonymous(true);

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
        $document->object()->setFile($uploadedFile);
        $document->save();

        $this->browser()
            ->get('/api/documents/' . $document->getId(), [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('mimetype', 'application/pdf');

        // Safe cleanup
        if (file_exists($tempFile)) {
            unlink($tempFile);
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
        $pdfDocument->object()->setFile($pdfFile);
        $pdfDocument->save();

        $txtDocument = DocumentFactory::new()->withoutPersisting()->create();
        $txtDocument->object()->setFile($txtFile);
        $txtDocument->save();

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

        // Safe cleanup
        if (file_exists($pdfTempFile)) {
            unlink($pdfTempFile);
        }
        if (file_exists($txtTempFile)) {
            unlink($txtTempFile);
        }
    }

}