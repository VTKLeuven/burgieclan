<?php

namespace App\Tests\Api;

use App\Factory\UserFactory;
use Zenstruck\Browser\HttpOptions;
use Zenstruck\Foundry\Test\Factories;
use Zenstruck\Foundry\Test\ResetDatabase;

class UserResourceTest extends ApiTestCase
{
    use ResetDatabase;
    use Factories;

    public function testGetOneUser(): void
    {
        $currentUser = UserFactory::createOne(
            [
                'username' => 'current user',
                'plainPassword' => 'password'
            ]);
        $otherUser = UserFactory::createOne();

        $currentUserTokenResponse = $this->browser()
            ->post('/api/auth/login', HttpOptions::json([
                'username' => $currentUser->getUsername(),
                'password' => 'password',
            ]))
            ->json()
            ->decoded();
        $currentUserToken = $currentUserTokenResponse['token'];

        $json = $this->browser()
            ->get('/api/users/' . $currentUser->getId(), [
                'headers' => [
                    'Authorization' =>'Bearer ' . $currentUserToken
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"@id"', '/api/users/' . $currentUser->getId())
            ->json();

        $this->assertEqualsCanonicalizing([
            '@context',
            '@id',
            '@type',
            'fullName',
            'username',
            'email',
        ], array_keys($json->decoded()));

        $json = $this->browser()
            ->get('/api/users/' . $otherUser->getId(), [
                'headers' => [
                    'Authorization' =>'Bearer ' . $currentUserToken
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"@id"', '/api/users/' . $otherUser->getId())
            ->json();

        $this->assertEqualsCanonicalizing([
            '@context',
            '@id',
            '@type',
            'fullName',
        ], array_keys($json->decoded()));
    }
}