<?php

namespace App\Tests\Api;

use App\Factory\CourseFactory;
use App\Factory\DocumentFactory;
use App\Factory\ModuleFactory;
use App\Factory\ProgramFactory;
use App\Factory\UserFactory;
use ZipArchive;

class DownloadZipResourceTest extends ApiTestCase
{
    /** @var string[] */
    private array $createdFiles = [];

    protected function tearDown(): void
    {
        foreach ($this->createdFiles as $path) {
            if (is_file($path)) {
                unlink($path);
            }
        }
        $this->createdFiles = [];
        parent::tearDown();
    }

    private function storeFile(string $name, string $contents): string
    {
        $path = \dirname(__DIR__, 2) . '/data/documents/' . $name;
        if (!is_dir(\dirname($path))) {
            mkdir(\dirname($path), 0775, true);
        }
        file_put_contents($path, $contents);
        $this->createdFiles[] = $path;

        return $name;
    }

    /**
     * Requests a zip, follows the returned link without credentials and opens the result.
     */
    private function downloadZip(array $payload): ZipArchive
    {
        $url = $this->browser()
            ->post(
                '/api/zip',
                [
                    'headers' => [
                        'Content-Type' => 'application/ld+json',
                        'Authorization' => 'Bearer ' . $this->token
                    ],
                    'json' => $payload + ['programs' => [], 'modules' => [], 'courses' => [], 'documents' => []],
                ]
            )
            ->assertStatus(200)
            ->assertHeaderContains('Cache-Control', 'no-store')
            ->json()
            ->decoded()['url'];

        $this->assertStringStartsWith('/files/export/', $url);

        $browser = $this->browser()
            ->get($url)
            ->assertStatus(200)
            ->assertHeaderContains('Content-Type', 'application/zip')
            ->assertHeaderContains('Content-Disposition', 'attachment');

        $zipPath = tempnam(sys_get_temp_dir(), 'zip_test_');
        $this->createdFiles[] = $zipPath;
        $response = $browser->client()->getInternalResponse();
        file_put_contents($zipPath, $response->getContent());

        // The export itself lands in data/exports while tests store documents locally.
        preg_match('#/files/export/([A-Za-z0-9]+\.zip)#', $url, $matches);
        $this->createdFiles[] = \dirname(__DIR__, 2) . '/data/exports/' . $matches[1];

        $zip = new ZipArchive();
        $this->assertTrue($zip->open($zipPath));

        return $zip;
    }

    /**
     * @return string[]
     */
    private function entryNames(ZipArchive $zip): array
    {
        $names = [];
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $names[] = basename((string) $zip->getNameIndex($i));
        }

        return $names;
    }

    public function testDownloadZipFileSuccessfully()
    {
        $program = ProgramFactory::createOne();
        $module = ModuleFactory::createOne();
        $course = CourseFactory::createOne();
        $document = DocumentFactory::createOne(
            [
            'name' => 'Selected Notes',
            'file_name' => $this->storeFile('zip-test-selected.pdf', "%PDF-1.7\nselected"),
            'under_review' => false,
            ]
        );

        $zip = $this->downloadZip(
            [
            'programs' => ['/api/programs/' . $program->getId()],
            'modules' => ['/api/modules/' . $module->getId()],
            'courses' => ['/api/courses/' . $course->getId()],
            'documents' => ['/api/documents/' . $document->getId()],
            ]
        );

        $this->assertContains('Selected Notes.pdf', $this->entryNames($zip));
        $this->assertContains('burgieclan-documents-index.html', $this->entryNames($zip));
    }

    public function testZipOnlyContainsDocumentsTheUserMayOpen()
    {
        $course = CourseFactory::createOne();
        $otherUser = UserFactory::createOne();
        DocumentFactory::createOne(
            [
            'name' => 'Approved Summary',
            'course' => $course,
            'file_name' => $this->storeFile('zip-test-approved.pdf', "%PDF-1.7\napproved"),
            'under_review' => false,
            ]
        );
        DocumentFactory::createOne(
            [
            'name' => 'Pending In Course',
            'course' => $course,
            'file_name' => $this->storeFile('zip-test-pending-course.pdf', "%PDF-1.7\npending"),
            'under_review' => true,
            'creator' => $otherUser,
            ]
        );
        $pendingSelected = DocumentFactory::createOne(
            [
            'name' => 'Pending Selected',
            'file_name' => $this->storeFile('zip-test-pending-selected.pdf', "%PDF-1.7\npending"),
            'under_review' => true,
            'creator' => $otherUser,
            ]
        );

        $zip = $this->downloadZip(
            [
            'courses' => ['/api/courses/' . $course->getId()],
            'documents' => ['/api/documents/' . $pendingSelected->getId()],
            ]
        );

        $names = $this->entryNames($zip);
        $this->assertContains('Approved Summary.pdf', $names);
        $this->assertNotContains('Pending In Course.pdf', $names);
        $this->assertNotContains('Pending Selected.pdf', $names);
        $this->assertSame("%PDF-1.7\napproved", $zip->getFromName($this->pathOf($zip, 'Approved Summary.pdf')));
    }

    private function pathOf(ZipArchive $zip, string $basename): string
    {
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $name = (string) $zip->getNameIndex($i);
            if (basename($name) === $basename) {
                return $name;
            }
        }

        return '';
    }

    public function testExpiredOrForgedExportLinksAreRefused()
    {
        $this->browser()->get('/files/export/0123456789abcdef0123456789abcdef.zip')->assertStatus(403);
    }

    public function testDownloadZipFileNoContent()
    {
        $this->browser()
            ->post(
                '/api/zip',
                [
                    'headers' => [
                        'Content-Type' => 'application/ld+json',
                        'Authorization' => 'Bearer ' . $this->token
                    ],
                    'json' => [
                        'programs' => [],
                        'modules' => [],
                        'courses' => [],
                        'documents' => [],
                    ],
                ]
            )
            ->assertStatus(204);
    }

    public function testDownloadZipFileInvalidData()
    {
        $this->browser()
            ->post(
                '/api/zip',
                [
                    'headers' => [
                        'Content-Type' => 'application/ld+json',
                        'Authorization' => 'Bearer ' . $this->token
                    ],
                    'json' => [
                        'programs' => 'invalid',
                        'modules' => 'invalid',
                        'courses' => 'invalid',
                        'documents' => 'invalid',
                    ],
                ]
            )
            ->assertStatus(400);
    }
}
