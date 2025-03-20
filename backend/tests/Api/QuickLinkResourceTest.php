<?php

namespace App\Tests\Api;

use App\Factory\QuickLinkFactory;
use Zenstruck\Foundry\Test\Factories;
use Zenstruck\Foundry\Test\ResetDatabase;

class QuickLinkResourceTest extends ApiTestCase
{
    use ResetDatabase;
    use Factories;

    public function testGetCollectionOfQuickLinks(): void
    {
        QuickLinkFactory::createMany(5);
        $json = $this->browser()
            ->get('/api/quick_links', [
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
            'linkTo',
        ]);
    }

    public function testGetOneQuickLink(): void
    {
        $quickLink = QuickLinkFactory::createOne();

        $this->browser()
            ->get('/api/quick_links/' . $quickLink->getId(), [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"@id"', '/api/quick_links/' . $quickLink->getId());
    }
}
