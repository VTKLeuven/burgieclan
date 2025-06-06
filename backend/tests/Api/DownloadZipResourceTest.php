<?php

namespace App\Tests\Api;

use App\Factory\CourseFactory;
use App\Factory\DocumentFactory;
use App\Factory\ModuleFactory;
use App\Factory\ProgramFactory;
use Zenstruck\Foundry\Test\Factories;
use Zenstruck\Foundry\Test\ResetDatabase;

class DownloadZipResourceTest extends ApiTestCase
{
    use ResetDatabase;
    use Factories;

    public function testDownloadZipFileSuccessfully()
    {
        $program = ProgramFactory::createOne();
        $module = ModuleFactory::createOne();
        $course = CourseFactory::createOne();
        $document = DocumentFactory::createOne();

        $this->browser()
            ->post('/api/zip', [
                'headers' => [
                    'Content-Type' => 'application/ld+json',
                    'Authorization' => 'Bearer ' . $this->token
                ],
                'json' => [
                    'programs' => ['/api/programs/' . $program->getId()],
                    'modules' => ['/api/modules/' . $module->getId()],
                    'courses' => ['/api/courses/' . $course->getId()],
                    'documents' => ['/api/documents/' . $document->getId()],
                ],
            ])
            ->assertStatus(200)
            ->assertHeaderContains('content-type', 'application/zip');
    }

    public function testDownloadZipFileNoContent()
    {
        $this->browser()
            ->post('/api/zip', [
                'headers' => [
                    'Content-Type' => 'application/ld+json',
                    'Authorization' =>'Bearer ' . $this->token
                ],
                'json' => [
                    'programs' => [],
                    'modules' => [],
                    'courses' => [],
                    'documents' => [],
                ],
            ])
            ->assertStatus(204);
    }

    public function testDownloadZipFileInvalidData()
    {
        $this->browser()
            ->post('/api/zip', [
                'headers' => [
                    'Content-Type' => 'application/ld+json',
                    'Authorization' =>'Bearer ' . $this->token
                ],
                'json' => [
                    'programs' => 'invalid',
                    'modules' => 'invalid',
                    'courses' => 'invalid',
                    'documents' => 'invalid',
                ],
            ])
            ->assertStatus(400);
    }
}
