<?php

namespace App\Tests\Api;

use App\Factory\ProgramFactory;

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
                'language',
                'modules',
                'createdAt',
                'updatedAt',
            ],
            array_keys($json->decoded()['hydra:member'][0])
        );
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
