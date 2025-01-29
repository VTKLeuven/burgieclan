<?php

namespace App\Tests\Api;

use App\Factory\CourseFactory;
use App\Factory\DocumentFactory;
use App\Factory\ModuleFactory;
use App\Factory\ProgramFactory;
use App\Factory\UserFactory;
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
            ]
        );
        $currentUserToken = $this->getToken('current user', 'password');
        $otherUser = UserFactory::createOne();

        $json = $this->browser()
            ->get('/api/users/' . $currentUser->getId(), [
                'headers' => [
                    'Authorization' => 'Bearer ' . $currentUserToken
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
            'favoriteCourses',
            'favoriteDocuments',
            'favoriteModules',
            'favoritePrograms'
        ], array_keys($json->decoded()));

        $json = $this->browser()
            ->get('/api/users/' . $otherUser->getId(), [
                'headers' => [
                    'Authorization' => 'Bearer ' . $currentUserToken
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
        $user = UserFactory::CreateOne([
            'plainPassword' => 'password',
            'favoriteCourses' => [$course],
            'favoriteModules' => [$module],
            'favoritePrograms' => [$program],
            'favoriteDocuments' => [$document],
        ]);
        $userToken = $this->getToken($user->getUsername(), 'password');
        $otherUser = UserFactory::createOne();

        self::assertEquals(1, count($user->getFavoriteCourses()));
        self::assertEquals(1, count($user->getFavoriteModules()));
        self::assertEquals(1, count($user->getFavoritePrograms()));
        self::assertEquals(1, count($user->getFavoriteDocuments()));


        $this->browser()
            ->get('/api/users/' . $user->getId(), [
                'headers' => [
                    'Authorization' => 'Bearer ' . $userToken
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"@id"', '/api/users/' . $user->getId())
            ->assertJsonMatches('length(favoriteCourses)', 1)
            ->assertJsonMatches('length(favoriteModules)', 1)
            ->assertJsonMatches('length(favoritePrograms)', 1)
            ->assertJsonMatches('length(favoriteDocuments)', 1)
            ->assertJsonMatches('favoriteCourses[0]."@id"', '/api/courses/' . $course->getId())
            ->assertJsonMatches('favoriteModules[0]."@id"', '/api/modules/' . $module->getId())
            ->assertJsonMatches('favoritePrograms[0]."@id"', '/api/programs/' . $program->getId())
            ->assertJsonMatches('favoriteDocuments[0]."@id"', '/api/documents/' . $document->getId())
            ->get('/api/users/' . $user->getId() . '/favorites', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $userToken
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"@id"', '/api/users/' . $user->getId() . '/favorites')
            ->assertJsonMatches('length(favoriteCourses)', 1)
            ->assertJsonMatches('length(favoriteModules)', 1)
            ->assertJsonMatches('length(favoritePrograms)', 1)
            ->assertJsonMatches('length(favoriteDocuments)', 1)
            ->assertJsonMatches('favoriteCourses[0]', '/api/courses/' . $course->getId())
            ->assertJsonMatches('favoriteModules[0]', '/api/modules/' . $module->getId())
            ->assertJsonMatches('favoritePrograms[0]', '/api/programs/' . $program->getId())
            ->assertJsonMatches('favoriteDocuments[0]', '/api/documents/' . $document->getId());

        $this->browser()
            ->get('/api/users/' . $otherUser->getId() . '/favorites', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $userToken
                ]
            ])
            ->assertStatus(403);
    }

    public function testAddFavorites(): void
    {
        $course = CourseFactory::createOne();
        $module = ModuleFactory::createOne();
        $program = ProgramFactory::createOne();
        $document = DocumentFactory::createOne();
        $user = UserFactory::CreateOne(['plainPassword' => 'password']);
        $userToken = $this->getToken($user->getUsername(), 'password');
        $otherUser = UserFactory::createOne();

        self::assertEmpty($user->getFavoriteCourses());
        self::assertEmpty($user->getFavoriteModules());
        self::assertEmpty($user->getFavoritePrograms());
        self::assertEmpty($user->getFavoriteDocuments());

        $this->browser()
            ->patch('/api/users/' . $user->getId() . '/favorites/add', [
                'headers' => [
                    'Content-Type' => 'application/merge-patch+json',
                    'Authorization' => 'Bearer ' . $userToken
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
            ->assertJsonMatches('favoriteCourses[0]', '/api/courses/' . $course->getId())
            ->assertJsonMatches('favoriteModules[0]', '/api/modules/' . $module->getId())
            ->assertJsonMatches('favoritePrograms[0]', '/api/programs/' . $program->getId())
            ->assertJsonMatches('favoriteDocuments[0]', '/api/documents/' . $document->getId())
        ;

        self::assertEquals(1, count($user->getFavoriteCourses()));
        self::assertEquals(1, count($user->getFavoriteModules()));
        self::assertEquals(1, count($user->getFavoritePrograms()));
        self::assertEquals(1, count($user->getFavoriteDocuments()));

        $this->browser()
            ->patch('/api/users/' . $otherUser->getId() . '/favorites/add', [
                'headers' => [
                    'Content-Type' => 'application/merge-patch+json',
                    'Authorization' => 'Bearer ' . $userToken
                ],
                'json' => [
                    'favoriteCourses' => ['/api/courses/' . $course->getId()],
                    'favoriteModules' => ['/api/modules/' . $module->getId()],
                    'favoritePrograms' => ['/api/programs/' . $program->getId()],
                    'favoriteDocuments' => ['/api/documents/' . $document->getId()],
                ]
            ])
            ->assertStatus(403);
    }

    public function testRemoveFavorites(): void
    {
        $course1 = CourseFactory::createOne();
        $course2 = CourseFactory::createOne();
        $module1 = ModuleFactory::createOne();
        $module2 = ModuleFactory::createOne();
        $program1 = ProgramFactory::createOne();
        $program2 = ProgramFactory::createOne();
        $document1 = DocumentFactory::createOne();
        $document2 = DocumentFactory::createOne();
        $user = UserFactory::CreateOne([
            'plainPassword' => 'password',
            'favoriteCourses' => [$course1, $course2],
            'favoriteModules' => [$module1, $module2],
            'favoritePrograms' => [$program1, $program2],
            'favoriteDocuments' => [$document1, $document2],
        ]);
        $userToken = $this->getToken($user->getUsername(), 'password');
        $otherUser = UserFactory::createOne();

        self::assertEquals(2, count($user->getFavoriteCourses()));
        self::assertEquals(2, count($user->getFavoriteModules()));
        self::assertEquals(2, count($user->getFavoritePrograms()));
        self::assertEquals(2, count($user->getFavoriteDocuments()));


        $this->browser()
            ->patch('/api/users/' . $user->getId() . '/favorites/remove', [
                'headers' => [
                    'Content-Type' => 'application/merge-patch+json',
                    'Authorization' => 'Bearer ' . $userToken
                ],
                'json' => [
                    'favoriteCourses' => ['/api/courses/' . $course2->getId()],
                    'favoriteModules' => ['/api/modules/' . $module2->getId()],
                    'favoritePrograms' => ['/api/programs/' . $program2->getId()],
                    'favoriteDocuments' => ['/api/documents/' . $document2->getId()],
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('length(favoriteCourses)', 1)
            ->assertJsonMatches('length(favoriteModules)', 1)
            ->assertJsonMatches('length(favoritePrograms)', 1)
            ->assertJsonMatches('length(favoriteDocuments)', 1)
            ->assertJsonMatches('favoriteCourses[0]', '/api/courses/' . $course1->getId())
            ->assertJsonMatches('favoriteModules[0]', '/api/modules/' . $module1->getId())
            ->assertJsonMatches('favoritePrograms[0]', '/api/programs/' . $program1->getId())
            ->assertJsonMatches('favoriteDocuments[0]', '/api/documents/' . $document1->getId());

        self::assertEquals(1, count($user->getFavoriteCourses()));
        self::assertEquals(1, count($user->getFavoriteModules()));
        self::assertEquals(1, count($user->getFavoritePrograms()));
        self::assertEquals(1, count($user->getFavoriteDocuments()));

        $this->browser()
            ->patch('/api/users/' . $otherUser->getId() . '/favorites/remove', [
                'headers' => [
                    'Content-Type' => 'application/merge-patch+json',
                    'Authorization' => 'Bearer ' . $userToken
                ],
                'json' => [
                    'favoriteCourses' => ['/api/courses/' . $course2->getId()],
                    'favoriteModules' => ['/api/modules/' . $module2->getId()],
                    'favoritePrograms' => ['/api/programs/' . $program2->getId()],
                    'favoriteDocuments' => ['/api/documents/' . $document2->getId()],
                ]
            ])
            ->assertStatus(403);
    }
}
