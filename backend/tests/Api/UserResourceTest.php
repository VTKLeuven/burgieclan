<?php

namespace App\Tests\Api;

use App\Factory\UserFactory;
use Zenstruck\Foundry\Test\Factories;
use Zenstruck\Foundry\Test\ResetDatabase;

class UserResourceTest extends ApiTestCase
{
    use ResetDatabase;
    use Factories;

    public function testGetOneUser(): void
    {
        $user = UserFactory::createOne();

        $this->browser()
            ->get('/api/users/'.$user->getId())
            ->assertJson()
            ->assertJsonMatches('"@id"', '/api/users/' . $user->getId());
    }
}