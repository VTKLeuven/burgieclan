<?php

namespace App\Tests\Api;

use App\Entity\Course;
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
        $em = self::getContainer()->get('doctrine')->getManager();
        $depth2Course = (new Course())
            ->setCode('H01A1A')
            ->setName('Analyse I')
            ->setNameNl('Analyse I')
            ->setNameEn('Calculus I')
            ->setLanguage('nl')
            ->setCredits(6)
            ->setSemesters(['Semester 1']);
        $depth3Course = (new Course())
            ->setCode('H02B2B')
            ->setName('Keuzevak A')
            ->setNameNl('Keuzevak A')
            ->setNameEn('Elective Course A')
            ->setLanguage('nl')
            ->setCredits(3)
            ->setSemesters(['Semester 2']);
        $em->persist($depth2Course);
        $em->persist($depth3Course);
        $em->flush();

        $program = ProgramFactory::createOne();
        $grandchild = ModuleFactory::createOne(
            [
            'program' => null,
            'name' => 'Searchable grandchild',
            'courses' => [$depth3Course],
            'modules' => [],
            ]
        );
        $child = ModuleFactory::createOne(
            [
            'program' => null,
            'name' => 'Searchable child',
            'courses' => [$depth2Course],
            'modules' => [$grandchild],
            ]
        );
        ModuleFactory::createOne(
            [
            'program' => $program,
            'name' => 'Searchable parent',
            'courses' => [],
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
        $childJson = $programJson['modules'][0]['modules'][0];
        $this->assertSame('Searchable child', $childJson['name']);
        $this->assertSame('H01A1A', $childJson['courses'][0]['code']);
        $this->assertSame('Analyse I', $childJson['courses'][0]['name']);
        $this->assertSame('Analyse I', $childJson['courses'][0]['nameNl']);
        $this->assertSame('Calculus I', $childJson['courses'][0]['nameEn']);
        $this->assertSame(6, $childJson['courses'][0]['credits']);
        $this->assertSame(['Semester 1'], $childJson['courses'][0]['semesters']);

        $grandchildJson = $childJson['modules'][0];
        $this->assertSame('Searchable grandchild', $grandchildJson['name']);
        $this->assertSame('H02B2B', $grandchildJson['courses'][0]['code']);
        $this->assertSame('Keuzevak A', $grandchildJson['courses'][0]['name']);
        $this->assertSame('Keuzevak A', $grandchildJson['courses'][0]['nameNl']);
        $this->assertSame('Elective Course A', $grandchildJson['courses'][0]['nameEn']);
        $this->assertSame(3, $grandchildJson['courses'][0]['credits']);
        $this->assertSame(['Semester 2'], $grandchildJson['courses'][0]['semesters']);
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
