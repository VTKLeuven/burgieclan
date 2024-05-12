<?php

namespace App\Tests\Api;

use App\Factory\CommentCategoryFactory;
use App\Factory\CourseCommentFactory;
use App\Factory\CourseFactory;
use App\Factory\UserFactory;
use App\Tests\Api\ApiTestCase;
use Zenstruck\Browser\HttpOptions;
use Zenstruck\Foundry\Test\Factories;
use Zenstruck\Foundry\Test\ResetDatabase;

class CourseCommentResourceTest extends ApiTestCase
{
    use ResetDatabase;
    use Factories;

    public function testGetCollectionOfCourseComments(): void
    {
        CourseCommentFactory::createMany(5);
        $json = $this->browser()
            ->get('/api/course_comments', [
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
            'content',
            'anonymous',
            'course',
            'category',
            'creator',
            'createdAt',
            'updatedAt',
        ]);
    }

    public function testGetOneCourseComment(): void
    {
        $comment = CourseCommentFactory::createOne();

        $this->browser()
            ->get('/api/course_comments/' . $comment->getId(), [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"@id"', '/api/course_comments/'.$comment->getId());
    }

    public function testGetCourseCommentFilterByContent(): void
    {
        $comment1 = CourseCommentFactory::createOne([
            'content' => 'comment1',
        ]);

        $comment2 = CourseCommentFactory::createOne([
            'content' => 'comment2',
        ]);

        $comment3 = CourseCommentFactory::createOne([
            'content' => 'comment3',
        ]);

        CourseCommentFactory::createMany(5);

        $this->browser()
            ->get('/api/course_comments?content=comment2', [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
            ->get('/api/course_comments?content=comment', [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3)
        ;
    }

    public function testGetCourseCommentFilterByAnonymous(): void
    {
        CourseCommentFactory::createMany(3, [
            'anonymous' => true,
        ]);
        CourseCommentFactory::createMany(5, [
            'anonymous' => false,
        ]);

        $this->browser()
            ->get('/api/course_comments?anonymous=true', [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3)
            ->get('/api/course_comments?anonymous=false', [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 5)
            ->assertJsonMatches('length("hydra:member")', 5)
        ;
    }

    public function testPostToCreateCourseComment(): void
    {
        $user = UserFactory::createOne();
        $course = CourseFactory::createOne();
        $category = CommentCategoryFactory::createOne();

        $this->browser()
            ->actingAs($user)
            ->post('/api/course_comments', [
                'json' => [],
                'headers' => [
                    'Content-Type' => 'application/ld+json',
                ],
            ])
            ->assertStatus(422)
            ->post('/api/course_comments', [
                'json' => [
                    'content' => 'The content of this comment',
                    'anonymous' => true,
                    'course' => '/api/courses/' . $course->getId(),
                    'category' => '/api/comment_categories/' . $category->getId(),
                ],
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(201)
            ->assertJsonMatches('content', 'The content of this comment')
        ;
    }

    public function testPatchToUpdateCourseComment()
    {
        $comment = CourseCommentFactory::createOne();

        $this->browser()
            ->patch('/api/course_comments/'.$comment->getId(), [
                'json' => [
                    'content' => 'Some new content',
                ],
                'headers' => [
                    'Content-Type' => 'application/merge-patch+json',
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJsonMatches('content', 'Some new content')
        ;
    }

    public function testDeleteCourseComment(){
        $comment = CourseCommentFactory::createOne();
        $commentId = $comment->getId();

        $this->browser()
            ->get('/api/course_comments/' . $commentId, [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200);

        $this->browser()
            ->delete('/api/course_comments/' . $commentId, [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(204)
        ;

        $this->browser()
            ->get('/api/course_comments/' . $commentId, [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(404);
    }
}