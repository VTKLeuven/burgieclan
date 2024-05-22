<?php

namespace App\Tests\Api;

use App\Factory\ModuleFactory;
use Zenstruck\Foundry\Test\Factories;
use Zenstruck\Foundry\Test\ResetDatabase;

class ModuleResourceTest extends ApiTestCase
{
    use ResetDatabase;
    use Factories;

    public function testGetCollectionOfModules(): void
    {
        ModuleFactory::createMany(5);
        $json = $this->browser()
            ->get('/api/modules', [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 5)
            ->assertJsonMatches('length("hydra:member")', 5)
            ->json()
        ;

        $this->assertSame(array_keys($json->decoded()['hydra:member'][0]), [
            '@id',
            '@type',
            'name',
            'courses',
            'program',
        ]);
    }

    public function testGetOneModule(): void
    {
        $module = ModuleFactory::createOne();

        $this->browser()
            ->get('/api/modules/' . $module->getId(), [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"@id"', '/api/modules/'.$module->getId());
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
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
            ->get('/api/modules?name=testmodule', [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3)
        ;
    }
}