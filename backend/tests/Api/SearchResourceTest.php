<?php

namespace App\Tests\Api;

use App\Factory\CourseFactory;
use App\Factory\DocumentFactory;
use App\Factory\ModuleFactory;
use App\Factory\ProgramFactory;

class SearchResourceTest extends ApiTestCase
{
    public function testSearch(): void
    {
        CourseFactory::createMany(5);
        $course = CourseFactory::createOne(
            [
                'name' => 'CoursewitUniqueName1',
            ]
        );
        ModuleFactory::createMany(5);
        $module = ModuleFactory::createOne(
            [
                'name' => 'ModulewitUniqueName1',
            ]
        );
        ProgramFactory::createMany(5);
        $program = ProgramFactory::createOne(
            [
                'name' => 'ProgramwitUniqueName1',
            ]
        );
        DocumentFactory::createMany(5);
        $document = DocumentFactory::createOne(
            [
                'name' => 'DocumentwitUniqueName1',
            ]
        );

        $json = $this->browser()
            ->get('/api/search?searchText=rsewitUnique')
            ->assertStatus(401)
            ->get(
                '/api/search?searchText=rsewitUnique',
                [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->token
                    ]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->json();

        $decoded_json = $json->decoded();
        $this->assertSame(
            array_keys($decoded_json),
            [
                '@context',
                '@id',
                '@type',
                'courses',
                'modules',
                'programs',
                'documents',
            ]
        );
        $courses = $decoded_json['courses'];
        $this->assertSame(1, count($courses));
        $this->assertSame('/api/courses/' . $course->getId(), $courses[0]['@id']);

        $json = $this->browser()
            ->get('/api/search?searchText=ulewitUniqueNa')
            ->assertStatus(401)
            ->get(
                '/api/search?searchText=ulewitUniqueName1',
                [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->token
                    ]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->json();

        $decoded_json = $json->decoded();
        $this->assertSame(
            array_keys($decoded_json),
            [
                '@context',
                '@id',
                '@type',
                'courses',
                'modules',
                'programs',
                'documents',
            ]
        );
        $modules = $decoded_json['modules'];
        $this->assertSame(1, count($modules));
        $this->assertSame('/api/modules/' . $module->getId(), $modules[0]['@id']);

        $json = $this->browser()
            ->get('/api/search?searchText=gramwitUniqueNa')
            ->assertStatus(401)
            ->get(
                '/api/search?searchText=gramwitUniqueNa',
                [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->token
                    ]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->json();

        $decoded_json = $json->decoded();
        $this->assertSame(
            array_keys($decoded_json),
            [
                '@context',
                '@id',
                '@type',
                'courses',
                'modules',
                'programs',
                'documents',
            ]
        );
        $programs = $decoded_json['programs'];
        $this->assertSame(1, count($programs));
        $this->assertSame('/api/programs/' . $program->getId(), $programs[0]['@id']);

        $json = $this->browser()
            ->get('/api/search?searchText=umentwitUniqueN')
            ->assertStatus(401)
            ->get(
                '/api/search?searchText=umentwitUniqueN',
                [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->token
                    ]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->json();

        $decoded_json = $json->decoded();
        $this->assertSame(
            array_keys($decoded_json),
            [
                '@context',
                '@id',
                '@type',
                'courses',
                'modules',
                'programs',
                'documents',
            ]
        );
        $documents = $decoded_json['documents'];
        $this->assertSame(1, count($documents));
        $this->assertSame('/api/documents/' . $document->getId(), $documents[0]['@id']);

        $json = $this->browser()
            ->get('/api/search?searchText=gwrergergherg')
            ->assertStatus(401)
            ->get(
                '/api/search?searchText=gwrergergherg',
                [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->token
                    ]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->json();

        $decoded_json = $json->decoded();
        $this->assertSame(
            array_keys($decoded_json),
            [
                '@context',
                '@id',
                '@type',
                'courses',
                'modules',
                'programs',
                'documents',
            ]
        );
        $courses = $decoded_json['courses'];
        $modules = $decoded_json['modules'];
        $programs = $decoded_json['programs'];
        $documents = $decoded_json['documents'];
        $this->assertSame(0, count($courses));
        $this->assertSame(0, count($modules));
        $this->assertSame(0, count($programs));
        $this->assertSame(0, count($documents));
    }

    public function testSearchIsCaseInsensitive(): void
    {
        // Regression: on PostgreSQL a plain LIKE is case-sensitive, so a lowercase query used to
        // miss differently-cased names. Searching "zzq..." (lowercase) must find "ZZQ..." (mixed).
        $program = ProgramFactory::createOne(['name' => 'ZZQUniqueProgramName']);
        $course = CourseFactory::createOne(['name' => 'ZZQUniqueCourseName', 'code' => 'ZZQ99X']);

        $decoded_json = $this->browser()
            ->get(
                '/api/search?searchText=zzquniqueprogram',
                ['headers' => ['Authorization' => 'Bearer ' . $this->token]]
            )
            ->assertStatus(200)
            ->assertJson()
            ->json()
            ->decoded();

        $this->assertSame(1, count($decoded_json['programs']));
        $this->assertSame('/api/programs/' . $program->getId(), $decoded_json['programs'][0]['@id']);

        // A lowercase query matching the (uppercase) course code must also hit case-insensitively.
        $decoded_json = $this->browser()
            ->get(
                '/api/search?searchText=zzq99x',
                ['headers' => ['Authorization' => 'Bearer ' . $this->token]]
            )
            ->assertStatus(200)
            ->assertJson()
            ->json()
            ->decoded();

        $this->assertSame(1, count($decoded_json['courses']));
        $this->assertSame('/api/courses/' . $course->getId(), $decoded_json['courses'][0]['@id']);
    }
}
