<?php

namespace App\Tests\Api;

use App\Factory\ModuleFactory;
use App\Factory\ProgramFactory;
use Zenstruck\Foundry\Test\Factories;
use Zenstruck\Foundry\Test\ResetDatabase;

class ModuleResourceTest extends ApiTestCase
{
    use ResetDatabase;
    use Factories;

    public function testGetCollectionOfModules(): void
    {
        ModuleFactory::createMany(5, [
            'program' => ProgramFactory::createOne(),
            'modules' => [], // Ensure no nested modules
        ]);
        $json = $this->browser()
            ->get('/api/modules', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 5)
            ->assertJsonMatches('length("hydra:member")', 5)
            ->json();

        $this->assertSame(array_keys($json->decoded()['hydra:member'][0]), [
            '@id',
            '@type',
            'name',
            'courses',
            'modules',
            'program',
        ]);
    }

    public function testGetCollectionOfModulesWithNoProgram(): void
    {
        ModuleFactory::createMany(5, [
            'program' => null,
            'modules' => [], // Ensure no nested modules
        ]);
        $json = $this->browser()
            ->get('/api/modules', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 5)
            ->assertJsonMatches('length("hydra:member")', 5)
            ->json();

        $this->assertSame(array_keys($json->decoded()['hydra:member'][0]), [
            '@id',
            '@type',
            'name',
            'courses',
            'modules',
        ]);
    }

    public function testGetCollectionOfModulesWithSubmodules(): void
    {
        // Create 3 modules, each with 2 submodules
        ModuleFactory::createMany(3, [
            'modules' => ModuleFactory::new(['modules' => []])->many(2),
        ]);
        $json = $this->browser()
            ->get('/api/modules', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('length("hydra:member")', 9) // 3 parents + 6 submodules
            ->json();

        // Find parent modules (those with 2 submodules)
        $parents = array_filter($json->decoded()['hydra:member'], fn($m) => isset($m['modules']) && count($m['modules']) === 2);
        $this->assertCount(3, $parents);
        foreach ($parents as $module) {
            foreach ($module['modules'] as $submodule) {
                $this->assertIsString($submodule); // Should be IRI string
            }
        }
    }

    public function testGetOneModuleWithSubmodules(): void
    {
        $submodules = ModuleFactory::createMany(2);
        $module = ModuleFactory::createOne([
            'modules' => $submodules,
        ]);

        $json = $this->browser()
            ->get('/api/modules/' . $module->getId(), [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->json();

        $this->assertArrayHasKey('modules', $json->decoded());
        $this->assertCount(2, $json->decoded()['modules']);
        foreach ($json->decoded()['modules'] as $submodule) {
            $this->assertArrayHasKey('@id', $submodule);
            $this->assertArrayHasKey('name', $submodule);
        }
    }

    public function testGetOneModule(): void
    {
        $module = ModuleFactory::createOne();

        $this->browser()
            ->get('/api/modules/' . $module->getId(), [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"@id"', '/api/modules/' . $module->getId());
    }

    public function testGetModuleFilterByName(): void
    {
        $module1 = ModuleFactory::createOne([
            'name' => 'testmodule1',
        ]);

        $module2 = ModuleFactory::createOne([
            'name' => 'testmodule2',
        ]);

        $module3 = ModuleFactory::createOne([
            'name' => 'testmodule3',
        ]);

        ModuleFactory::createMany(5);

        $this->browser()
            ->get('/api/modules?name=module2', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
            ->get('/api/modules?name=testmodule', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3);
    }
}