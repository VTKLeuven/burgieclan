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

    public function testGetQuickLinkFilterByName(): void
    {
        $link1 = QuickLinkFactory::createOne([
            'name' => 'testlink1',
        ]);

        $link2 = QuickLinkFactory::createOne([
            'name' => 'testlink2',
        ]);

        $link3 = QuickLinkFactory::createOne([
            'name' => 'testlink3',
        ]);

        QuickLinkFactory::createMany(5);

        $this->browser()
            ->get('/api/quick_links?name=testlink2', [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
            ->get('/api/quick_links?name=testlink', [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3)
        ;
    }

    public function testGetQuickLinkFilterByLinkTo(): void
    {
        $link1 = QuickLinkFactory::createOne([
            'linkTo' => 'example.com/1',
        ]);

        $link2 = QuickLinkFactory::createOne([
            'linkTo' => 'example.com/2',
        ]);

        $link3 = QuickLinkFactory::createOne([
            'linkTo' => 'example.com/3',
        ]);

        QuickLinkFactory::createMany(5);

        $this->browser()
            ->get('/api/quick_links?linkTo=example.com/2', [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
            ->get('/api/quick_links?linkTo=example.com/', [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3)
        ;
    }
}
