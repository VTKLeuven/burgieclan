<?php

namespace App\Tests\Api;

use App\Entity\Page;
use App\Factory\PageFactory;
use Zenstruck\Foundry\Proxy;
use Zenstruck\Foundry\Test\Factories;
use Zenstruck\Foundry\Test\ResetDatabase;

class PageResourceTest extends ApiTestCase
{
    use ResetDatabase;
    use Factories;

    public function testGetOnePagePublicAvailable(): void
    {
        $page = PageFactory::createOne(['publicAvailable' => true]);

        assert($page->isPublicAvailable());

        $this->browser()
            ->get('/api/pages/' . $page->getUrlKey())
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"@id"', '/api/pages/' . $page->getUrlKey());
    }

    public function testGetOnePagePublicNotAvailableUnauthorized(): void
    {
        $page = PageFactory::createOne(['publicAvailable' => false]);

        assert(!$page->isPublicAvailable());

        $this->browser()
            ->get('/api/pages/' . $page->getUrlKey())
            ->assertStatus(401);
    }

    public function testGetOnePagePublicNotAvailableAuthorized(): void
    {
        $page = PageFactory::createOne(['publicAvailable' => false]);

        assert(!$page->isPublicAvailable());

        $this->browser()
            ->get(
                '/api/pages/' . $page->getUrlKey(),
                [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"@id"', '/api/pages/' . $page->getUrlKey());
    }
}
