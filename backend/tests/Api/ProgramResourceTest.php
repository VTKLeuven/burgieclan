<?php

namespace Api;

use App\Factory\ProgramFactory;
use App\Tests\Api\ApiTestCase;
use Zenstruck\Foundry\Test\Factories;
use Zenstruck\Foundry\Test\ResetDatabase;

class ProgramResourceTest extends ApiTestCase
{
    use ResetDatabase;
    use Factories;

    public function testGetCollectionOfPrograms(): void
    {
        ProgramFactory::createMany(5);
        $json = $this->browser()
            ->get('/api/programs')
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 5)
            ->assertJsonMatches('length("hydra:member")', 5)
            ->json()
        ;

        $this->assertSame(array_keys($json->decoded()['hydra:member'][0]), [
            '@id',
            '@type',
            'name',
            'modules',
        ]);
    }

    public function testGetOneProgram(): void
    {
        $program = ProgramFactory::createOne();

        $this->browser()
            ->get('/api/programs/'.$program->getId())
            ->assertJson()
            ->assertJsonMatches('"@id"', '/api/programs/'.$program->getId());
    }

    public function testGetProgramFilterByName(): void
    {
        $program1 = ProgramFactory::createOne([
            'name' => 'program1',
        ]);

        $program2 = ProgramFactory::createOne([
            'name' => 'program2',
        ]);

        $program3 = ProgramFactory::createOne([
            'name' => 'program3',
        ]);

        ProgramFactory::createMany(5);

        $this->browser()
            ->get('/api/programs?name=program2')
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
            ->get('/api/programs?name=program')
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3)
        ;
    }
}