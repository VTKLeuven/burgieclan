<?php

namespace App\Tests\Api;

use App\Factory\CourseCommentVoteFactory;
use App\Factory\CourseFactory;
use App\Factory\DocumentCommentVoteFactory;
use App\Factory\DocumentFactory;
use App\Factory\DocumentVoteFactory;
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
            'favoritePrograms',
            'votes',
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
            ->assertJsonMatches('favoriteCourses[0]', '/api/courses/' . $course->getId())
            ->assertJsonMatches('favoriteModules[0]', '/api/modules/' . $module->getId())
            ->assertJsonMatches('favoritePrograms[0]', '/api/programs/' . $program->getId())
            ->assertJsonMatches('favoriteDocuments[0]', '/api/documents/' . $document->getId())
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
        $documentVote = DocumentVoteFactory::createOne();
        $documentCommentVote = DocumentCommentVoteFactory::createOne();
        $courseCommentVote = CourseCommentVoteFactory::createOne();

        $user = UserFactory::CreateOne([
            'plainPassword' => 'password',
            'votes' => [$documentVote, $documentCommentVote, $courseCommentVote],
        ]);
        $userToken = $this->getToken($user->getUsername(), 'password');
        $otherUser = UserFactory::createOne();

        self::assertEquals(3, count($user->getVotes()));

        $this->browser()
            ->patch('/api/users/' . $user->getId() . '/votes/remove', [
                'headers' => [
                    'Content-Type' => 'application/merge-patch+json',
                    'Authorization' => 'Bearer ' . $userToken
                ],
                'json' => [
                    'votes' => ['/api/votes/' . $documentCommentVote->getId()],
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('length(votes)', 3)
            ->assertJsonMatches('favoriteCourses[0]', '/api/votes/' . $documentCommentVote->getId());

        self::assertEquals(1, count($user->getVotes()));

        $this->browser()
            ->patch('/api/users/' . $otherUser->getId() . '/votes/remove', [
                'headers' => [
                    'Content-Type' => 'application/merge-patch+json',
                    'Authorization' => 'Bearer ' . $userToken
                ],
                'json' => [
                    'favoriteCourses' => ['/api/votes/' . $documentCommentVote->getId()],
                ]
            ])
            ->assertStatus(403);
    }
}
