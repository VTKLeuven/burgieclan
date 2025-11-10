<?php

namespace App\Tests\Api;

use App\Factory\CommentCategoryFactory;
use App\Factory\CourseCommentFactory;
use App\Factory\CourseFactory;
use App\Factory\UserFactory;
use Zenstruck\Browser\HttpOptions;
use Zenstruck\Foundry\Test\Factories;
use Zenstruck\Foundry\Test\ResetDatabase;

class CourseCommentResourceTest extends ApiTestCase
{
    use ResetDatabase;
    use Factories;

    public function testGetCollectionOfCourseComments(): void
    {
        CourseCommentFactory::createMany(
            5,
            [
            'anonymous' => false
            ]
        );
        $json = $this->browser()
            ->get(
                '/api/course_comments',
                [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 5)
            ->assertJsonMatches('length("hydra:member")', 5)
            ->json();

        $this->assertEqualsCanonicalizing(
            [
            '@id',
            '@type',
            'content',
            'anonymous',
            'course',
            'category',
            'creator',
            'createdAt',
            'updatedAt',
            ],
            array_keys($json->decoded()['hydra:member'][0])
        );
    }

    public function testGetOneCourseComment(): void
    {
        $comment = CourseCommentFactory::createOne();

        $this->browser()
            ->get(
                '/api/course_comments/' . $comment->getId(),
                [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"@id"', '/api/course_comments/' . $comment->getId());
    }

    public function testGetCourseCommentFilterByContent(): void
    {
        $comment1 = CourseCommentFactory::createOne(
            [
            'content' => 'comment1',
            ]
        );

        $comment2 = CourseCommentFactory::createOne(
            [
            'content' => 'comment2',
            ]
        );

        $comment3 = CourseCommentFactory::createOne(
            [
            'content' => 'comment3',
            ]
        );

        CourseCommentFactory::createMany(5);

        $this->browser()
            ->get(
                '/api/course_comments?content=comment2',
                [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
            ->get(
                '/api/course_comments?content=comment',
                [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
                ]
            )
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3);
    }

    public function testGetCourseCommentFilterByAnonymous(): void
    {
        CourseCommentFactory::createMany(
            3,
            [
            'anonymous' => true,
            ]
        );
        CourseCommentFactory::createMany(
            5,
            [
            'anonymous' => false,
            ]
        );

        $this->browser()
            ->get(
                '/api/course_comments?anonymous=true',
                [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3)
            ->get(
                '/api/course_comments?anonymous=false',
                [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 5)
            ->assertJsonMatches('length("hydra:member")', 5);
    }

    public function testGetCourseCommentFilterByCreator(): void
    {
        $user1 = UserFactory::createOne();
        $user2 = UserFactory::createOne();
        CourseCommentFactory::createMany(
            1,
            [
            'creator' => $user1,
            ]
        );
        CourseCommentFactory::createMany(
            2,
            [
            'creator' => $user2,
            ]
        );
        CourseCommentFactory::createMany(
            5,
            [
            'creator' => UserFactory::createOne(),
            ]
        );

        $this->browser()
            ->get(
                '/api/course_comments?creator=/api/users/' . $user1->getId(),
                [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
                ]
            )
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
            ->get(
                '/api/course_comments?creator[]=/api/users/' . $user1->getId() .
                '&creator[]=/api/users/' . $user2->getId(),
                [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
                ]
            )
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3)
            ->get(
                '/api/course_comments',
                [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
                ]
            )
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 8)
            ->assertJsonMatches('length("hydra:member")', 8);
    }

    public function testPostToCreateCourseComment(): void
    {
        $user = UserFactory::createOne(['plainPassword' => 'password']);
        $course = CourseFactory::createOne();
        $category = CommentCategoryFactory::createOne();

        $this->browser()
            ->post(
                '/api/course_comments',
                [
                'json' => [],
                'headers' => [
                    'Content-Type' => 'application/ld+json',
                    'Authorization' => 'Bearer ' . $this->getToken($user->getUsername(), 'password')
                ],
                ]
            )
            ->assertStatus(422)
            ->post(
                '/api/course_comments',
                [
                'json' => [
                    'content' => 'The content of this comment',
                    'anonymous' => true,
                    'course' => '/api/courses/' . $course->getId(),
                    'category' => '/api/comment_categories/' . $category->getId(),
                ],
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
                ]
            )
            ->assertStatus(201)
            ->assertJsonMatches('content', 'The content of this comment');
    }

    public function testPatchToUpdateCourseComment()
    {
        $creator = UserFactory::createOne(
            [
                'username' => 'creator',
                'plainPassword' => 'password'
            ]
        );
        $otherUser = UserFactory::createOne(
            [
                'username' => 'other user',
            'plainPassword' => 'password']
        );

        $creatorTokenResponse = $this->browser()
            ->post(
                '/api/auth/login',
                HttpOptions::json(
                    [
                    'username' => $creator->getUsername(),
                    'password' => 'password',
                    ]
                )
            )
            ->json()
            ->decoded();
        $creatorToken = $creatorTokenResponse['token'];

        $otherUserTokenResponse = $this->browser()
            ->post(
                '/api/auth/login',
                HttpOptions::json(
                    [
                    'username' => $otherUser->getUsername(),
                    'password' => 'password',
                    ]
                )
            )
            ->json()
            ->decoded();
        $otherToken = $otherUserTokenResponse['token'];

        $comment = CourseCommentFactory::createOne(
            [
            'creator' => $creator,
            ]
        );

        $this->browser()
            ->patch(
                '/api/course_comments/' . $comment->getId(),
                [
                'json' => [
                    'content' => 'Some new content',
                ],
                'headers' => [
                    'Content-Type' => 'application/merge-patch+json',
                    'Authorization' => 'Bearer ' . $creatorToken
                ]
                ]
            )
            ->assertStatus(200)
            ->assertJsonMatches('content', 'Some new content');

        $this->browser()
            ->patch(
                '/api/course_comments/' . $comment->getId(),
                [
                'json' => [
                    'content' => 'Some new content',
                ],
                'headers' => [
                    'Content-Type' => 'application/merge-patch+json',
                    'Authorization' => 'Bearer ' . $otherToken
                ]
                ]
            )
            ->assertStatus(403);
    }

    public function testDeleteCourseComment()
    {
        $creator = UserFactory::createOne(
            [
                'username' => 'creator',
                'plainPassword' => 'password'
            ]
        );
        $otherUser = UserFactory::createOne(
            [
                'username' => 'other user',
            'plainPassword' => 'password']
        );

        $creatorTokenResponse = $this->browser()
            ->post(
                '/api/auth/login',
                HttpOptions::json(
                    [
                    'username' => $creator->getUsername(),
                    'password' => 'password',
                    ]
                )
            )
            ->json()
            ->decoded();
        $creatorToken = $creatorTokenResponse['token'];

        $otherUserTokenResponse = $this->browser()
            ->post(
                '/api/auth/login',
                HttpOptions::json(
                    [
                    'username' => $otherUser->getUsername(),
                    'password' => 'password',
                    ]
                )
            )
            ->json()
            ->decoded();
        $otherToken = $otherUserTokenResponse['token'];

        $comment = CourseCommentFactory::createOne(
            [
            'creator' => $creator,
            ]
        );
        $commentId = $comment->getId();

        $this->browser()
            ->get(
                '/api/course_comments/' . $commentId,
                [
                'headers' => [
                    'Authorization' => 'Bearer ' . $creatorToken
                ]
                ]
            )
            ->assertStatus(200);

        $this->browser()
            ->delete(
                '/api/course_comments/' . $commentId,
                [
                'headers' => [
                    'Authorization' => 'Bearer ' . $otherToken
                ]
                ]
            )
            ->assertStatus(403);

        $this->browser()
            ->delete(
                '/api/course_comments/' . $commentId,
                [
                'headers' => [
                    'Authorization' => 'Bearer ' . $creatorToken
                ]
                ]
            )
            ->assertStatus(204);

        $this->browser()
            ->get(
                '/api/course_comments/' . $commentId,
                [
                'headers' => [
                    'Authorization' => 'Bearer ' . $creatorToken
                ]
                ]
            )
            ->assertStatus(404);
    }
}
