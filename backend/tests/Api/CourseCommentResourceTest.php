<?php

namespace App\Tests\Api;

use App\Factory\CommentCategoryFactory;
use App\Factory\CourseCommentFactory;
use App\Factory\CourseFactory;
use App\Factory\UserFactory;
use Zenstruck\Browser\HttpOptions;

class CourseCommentResourceTest extends ApiTestCase
{
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
                'anonymous' => false,
            ]
        );
        CourseCommentFactory::createMany(
            2,
            [
                'creator' => $user2,
                'anonymous' => false,
            ]
        );
        CourseCommentFactory::createMany(
            5,
            [
                'creator' => UserFactory::createOne(),
                'anonymous' => false,
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
                        'Content-Type' => 'application/ld+json',
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
                'plainPassword' => 'password'
            ]
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
                'plainPassword' => 'password'
            ]
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

    public function testFilterByCreatorExcludesAnonymousCourseComments(): void
    {
        $targetUser = UserFactory::createOne(['fullName' => 'Comment Targetsson']);
        $publicComment = CourseCommentFactory::createOne(
            [
            'creator' => $targetUser,
            'anonymous' => false,
            ]
        );
        CourseCommentFactory::createOne(
            [
            'creator' => $targetUser,
            'anonymous' => true,
            ]
        );

        $this->browser()
            ->get(
                '/api/course_comments?creator=/api/users/' . $targetUser->getId(),
                ['headers' => ['Authorization' => 'Bearer ' . $this->token]]
            )
            ->assertStatus(200)
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('"hydra:member"[0]."@id"', '/api/course_comments/' . $publicComment->getId());

        $this->browser()
            ->get(
                '/api/course_comments?creator.fullName=Targetsson',
                ['headers' => ['Authorization' => 'Bearer ' . $this->token]]
            )
            ->assertStatus(200)
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('"hydra:member"[0]."@id"', '/api/course_comments/' . $publicComment->getId());
    }

    /**
     * The course page puts the edited comment back in its row from this response: without the
     * name, a signed comment would show as anonymous after an edit.
     */
    public function testPatchResponseNamesTheCreatorButAnonymousCommentsStayAnonymous(): void
    {
        $creator = UserFactory::createOne(['fullName' => 'Edith Editor', 'plainPassword' => 'password']);
        $comment = CourseCommentFactory::createOne(['creator' => $creator, 'anonymous' => false]);
        $anonymous = CourseCommentFactory::createOne(['creator' => $creator, 'anonymous' => true]);

        $this->browser()
            ->patch(
                '/api/course_comments/' . $comment->getId(),
                [
                    'json' => ['content' => 'Edited'],
                    'headers' => [
                        'Content-Type' => 'application/merge-patch+json',
                        'Authorization' => 'Bearer ' . $this->getToken($creator->getUsername(), 'password'),
                    ],
                ]
            )
            ->assertStatus(200)
            ->assertJsonMatches('creator.fullName', 'Edith Editor');

        $this->browser()
            ->get(
                '/api/course_comments/' . $anonymous->getId(),
                ['headers' => ['Authorization' => 'Bearer ' . $this->token]]
            )
            ->assertStatus(200)
            ->assertJsonMatches('creator', null);
    }
}
