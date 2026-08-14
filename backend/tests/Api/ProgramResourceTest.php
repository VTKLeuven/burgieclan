<?php

namespace App\Tests\Api;

use App\Factory\ProgramFactory;
use App\Factory\ModuleFactory;

class ProgramResourceTest extends ApiTestCase
{
    public function testGetCollectionOfPrograms(): void
    {
        ProgramFactory::createMany(5);
        $json = $this->browser()
            ->get(
                '/api/programs',
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
            ],
            array_keys($json->decoded()['hydra:member'][0])
        );
    }

    public function testProgramCollectionDoesNotEmbedItsCurriculum(): void
    {
        $program = ProgramFactory::createOne(['name' => 'Civil Engineering']);
        $child = ModuleFactory::createOne(['program' => null, 'modules' => []]);
        ModuleFactory::createOne(
            [
            'program' => $program,
            'name' => 'Bachelor year one',
            'modules' => [$child],
            ]
        );

        $programJson = $this->browser()
            ->get(
                '/api/programs',
                ['headers' => ['Authorization' => 'Bearer ' . $this->token]]
            )
            ->assertStatus(200)
            ->json()
            ->decoded()['hydra:member'][0];

        $this->assertSame('Civil Engineering', $programJson['name']);
        $this->assertArrayNotHasKey('modules', $programJson);
        $this->assertArrayNotHasKey('language', $programJson);
    }

    public function testProgramDetailOnlyEmbedsDirectModuleNames(): void
    {
        $program = ProgramFactory::createOne();
        $child = ModuleFactory::createOne(['program' => null, 'modules' => []]);
        ModuleFactory::createOne(
            [
            'program' => $program,
            'name' => 'Direct module',
            'modules' => [$child],
            ]
        );

        $programJson = $this->browser()
            ->get(
                '/api/programs/' . $program->getId(),
                ['headers' => ['Authorization' => 'Bearer ' . $this->token]]
            )
            ->assertStatus(200)
            ->json()
            ->decoded();

        $this->assertCount(1, $programJson['modules']);
        $this->assertEqualsCanonicalizing(
            ['@id', '@type', 'name'],
            array_keys($programJson['modules'][0])
        );
        $this->assertSame('Direct module', $programJson['modules'][0]['name']);
        $this->assertArrayNotHasKey('courses', $programJson['modules'][0]);
        $this->assertArrayNotHasKey('modules', $programJson['modules'][0]);
    }

    public function testCurriculumTreeRemainsAvailableForExplicitSearches(): void
    {
        $program = ProgramFactory::createOne();
        $child = ModuleFactory::createOne(
            [
            'program' => null,
            'name' => 'Searchable child',
            'modules' => [],
            ]
        );
        ModuleFactory::createOne(
            [
            'program' => $program,
            'name' => 'Searchable parent',
            'modules' => [$child],
            ]
        );

        $programJson = $this->browser()
            ->get(
                '/api/programs/tree?pagination=false',
                ['headers' => ['Authorization' => 'Bearer ' . $this->token]]
            )
            ->assertStatus(200)
            ->json()
            ->decoded()['hydra:member'][0];

        $this->assertSame('Searchable parent', $programJson['modules'][0]['name']);
        $this->assertSame('Searchable child', $programJson['modules'][0]['modules'][0]['name']);
    }

    /**
     * The programme's language drives which course titles the curriculum navigator shows, so it
     * has to survive the trip to the frontend. It is derived from the import settings and defaults
     * to Dutch for programmes that were never imported.
     */
    public function testProgramExposesItsLanguage(): void
    {
        $dutch = ProgramFactory::createOne();
        $english = ProgramFactory::createOne(['importSettings' => ['lang' => 'en']]);

        foreach ([[$dutch, 'nl'], [$english, 'en']] as [$program, $expected]) {
            $this->browser()
                ->get(
                    '/api/programs/' . $program->getId(),
                    [
                        'headers' => [
                            'Authorization' => 'Bearer ' . $this->token
                        ]
                    ]
                )
                ->assertStatus(200)
                ->assertJson()
                ->assertJsonMatches('language', $expected);
        }
    }

    public function testGetOneProgram(): void
    {
        $program = ProgramFactory::createOne();

        $this->browser()
            ->get(
                '/api/programs/' . $program->getId(),
                [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->token
                    ]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"@id"', '/api/programs/' . $program->getId());
    }

    public function testGetProgramFilterByName(): void
    {
        $program1 = ProgramFactory::createOne(
            [
                'name' => 'program1',
            ]
        );

        $program2 = ProgramFactory::createOne(
            [
                'name' => 'program2',
            ]
        );

        $program3 = ProgramFactory::createOne(
            [
                'name' => 'program3',
            ]
        );

        ProgramFactory::createMany(5);

        $this->browser()
            ->get(
                '/api/programs?name=program2',
                [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->token
                    ]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
            ->get(
                '/api/programs?name=program',
                [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->token
                    ]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3);
    }
}
