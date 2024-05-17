<?php

namespace App\Tests\Api;

use App\Factory\CourseFactory;
use App\Factory\DocumentFactory;
use App\Factory\ModuleFactory;
use App\Factory\ProgramFactory;
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

    public function testGetFavorites(): void
    {
        $course = CourseFactory::createOne();
        $module = ModuleFactory::createOne();
        $program = ProgramFactory::createOne();
        $document = DocumentFactory::createOne();
        $user = UserFactory::createOne([
            'favoriteCourses' => [$course],
            'favoriteModules' => [$module],
            'favoritePrograms' => [$program],
            'favoriteDocuments' => [$document],
        ]);

        $this->browser()
            ->get('/api/users/' . $user->getId(), [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"@id"', '/api/users/' . $user->getId())
            ->assertJsonMatches('favoriteCourses[0]', '/api/courses/' . $course->getId())
            ->assertJsonMatches('favoriteModules[0]', '/api/modules/' . $module->getId())
            ->assertJsonMatches('favoritePrograms[0]', '/api/programs/' . $program->getId())
            ->assertJsonMatches('favoriteDocuments[0]', '/api/documents/' . $document->getId());
    }

    public function testAddFavorites(): void
    {
        $course = CourseFactory::createOne();
        $module = ModuleFactory::createOne();
        $program = ProgramFactory::createOne();
        $document = DocumentFactory::createOne();
        $user = UserFactory::createOne();

        self::assertEmpty($user->getFavoriteCourses());
        self::assertEmpty($user->getFavoriteModules());
        self::assertEmpty($user->getFavoritePrograms());
        self::assertEmpty($user->getFavoriteDocuments());

        $this->browser()
            ->patch('/api/users/' . $user->getId(), [
                'headers' => [
                    'Content-Type' => 'application/merge-patch+json',
                    'Authorization' =>'Bearer ' . $this->token
                ],
                'json' => [
                    'favoriteCourses' => ['/api/courses/' . $course->getId()],
                    'favoriteModules' => ['/api/modules/' . $module->getId()],
                    'favoritePrograms' => ['/api/programs/' . $program->getId()],
                    'favoriteDocuments' => ['/api/documents/' . $document->getId()],
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"@id"', '/api/users/' . $user->getId())
            ->assertJsonMatches('favoriteCourses[0]', '/api/courses/' . $course->getId())
            ->assertJsonMatches('favoriteModules[0]', '/api/modules/' . $module->getId())
            ->assertJsonMatches('favoritePrograms[0]', '/api/programs/' . $program->getId())
            ->assertJsonMatches('favoriteDocuments[0]', '/api/documents/' . $document->getId())
        ;
    }

    public function testRemoveFavorites(): void
    {
        $course = CourseFactory::createOne();
        $module = ModuleFactory::createOne();
        $program = ProgramFactory::createOne();
        $document = DocumentFactory::createOne();
        $user = UserFactory::createOne([
            'favoriteCourses' => [$course],
            'favoriteModules' => [$module],
            'favoritePrograms' => [$program],
            'favoriteDocuments' => [$document],
        ]);

        $this->browser()
            ->patch('/api/users/' . $user->getId(), [
                'headers' => [
                    'Content-Type' => 'application/merge-patch+json',
                    'Authorization' =>'Bearer ' . $this->token
                ],
                'json' => [
                    'favoriteCourses' => [],
                    'favoriteModules' => [],
                    'favoritePrograms' => [],
                    'favoriteDocuments' => [],
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"@id"', '/api/users/' . $user->getId())
            ->assertJsonMatches('length(favoriteCourses)', 0)
            ->assertJsonMatches('length(favoriteModules)', 0)
            ->assertJsonMatches('length(favoritePrograms)', 0)
            ->assertJsonMatches('length(favoriteDocuments)', 0)
        ;
    }
}