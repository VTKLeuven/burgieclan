<?php

namespace App\Tests\Api;

use App\Factory\CourseFactory;
use App\Factory\DocumentFactory;
use App\Factory\ModuleFactory;
use App\Factory\ProgramFactory;
use Zenstruck\Foundry\Test\Factories;
use Zenstruck\Foundry\Test\ResetDatabase;

class SearchResourceTest extends ApiTestCase
{
    use ResetDatabase;
    use Factories;

    public function testSearch(): void
    {
        CourseFactory::createMany(5);
        $course = CourseFactory::createOne([
            'name' => 'CoursewitUniqueName1',
        ]);
        ModuleFactory::createMany(5);
        $module = ModuleFactory::createOne([
            'name' => 'ModulewitUniqueName1',
        ]);
        ProgramFactory::createMany(5);
        $program = ProgramFactory::createOne([
            'name' => 'ProgramwitUniqueName1',
        ]);
        DocumentFactory::createMany(5);
        $document = DocumentFactory::createOne([
            'name' => 'DocumentwitUniqueName1',
        ]);

        $json = $this->browser()
            ->get('/api/search?searchText=rsewitUnique')
            ->assertStatus(401)
            ->get('/api/search?searchText=rsewitUnique', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->json();

        $decoded_json = $json->decoded();
        $this->assertSame(array_keys($decoded_json), [
            '@context',
            '@id',
            '@type',
            'courses',
            'modules',
            'programs',
            'documents',
        ]);
        $courses = $decoded_json['courses'];
        $this->assertSame(1, count($courses));
        $this->assertSame('/api/courses/' . $course->getId(), $courses[0]['@id']);

        $json = $this->browser()
            ->get('/api/search?searchText=ulewitUniqueNa')
            ->assertStatus(401)
            ->get('/api/search?searchText=ulewitUniqueName1', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->json();

        $decoded_json = $json->decoded();
        $this->assertSame(array_keys($decoded_json), [
            '@context',
            '@id',
            '@type',
            'courses',
            'modules',
            'programs',
            'documents',
        ]);
        $modules = $decoded_json['modules'];
        $this->assertSame(1, count($modules));
        $this->assertSame('/api/modules/' . $module->getId(), $modules[0]['@id']);

        $json = $this->browser()
            ->get('/api/search?searchText=gramwitUniqueNa')
            ->assertStatus(401)
            ->get('/api/search?searchText=gramwitUniqueNa', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->json();

        $decoded_json = $json->decoded();
        $this->assertSame(array_keys($decoded_json), [
            '@context',
            '@id',
            '@type',
            'courses',
            'modules',
            'programs',
            'documents',
        ]);
        $programs = $decoded_json['programs'];
        $this->assertSame(1, count($programs));
        $this->assertSame('/api/programs/' . $program->getId(), $programs[0]['@id']);

        $json = $this->browser()
            ->get('/api/search?searchText=umentwitUniqueN')
            ->assertStatus(401)
            ->get('/api/search?searchText=umentwitUniqueN', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->json();

        $decoded_json = $json->decoded();
        $this->assertSame(array_keys($decoded_json), [
            '@context',
            '@id',
            '@type',
            'courses',
            'modules',
            'programs',
            'documents',
        ]);
        $documents = $decoded_json['documents'];
        $this->assertSame(1, count($documents));
        $this->assertSame('/api/documents/' . $document->getId(), $documents[0]['@id']);

        $json = $this->browser()
            ->get('/api/search?searchText=gwrergergherg')
            ->assertStatus(401)
            ->get('/api/search?searchText=gwrergergherg', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->json();

        $decoded_json = $json->decoded();
        $this->assertSame(array_keys($decoded_json), [
            '@context',
            '@id',
            '@type',
            'courses',
            'modules',
            'programs',
            'documents',
        ]);
        $courses = $decoded_json['courses'];
        $modules = $decoded_json['modules'];
        $programs = $decoded_json['programs'];
        $documents = $decoded_json['documents'];
        $this->assertSame(0, count($courses));
        $this->assertSame(0, count($modules));
        $this->assertSame(0, count($programs));
        $this->assertSame(0, count($documents));
    }
}
