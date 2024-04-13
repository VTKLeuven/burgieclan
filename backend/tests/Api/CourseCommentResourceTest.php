<?php

namespace Api;

use App\Factory\CourseCommentFactory;
use App\Factory\CourseFactory;
use App\Tests\Api\ApiTestCase;
use Zenstruck\Foundry\Test\Factories;
use Zenstruck\Foundry\Test\ResetDatabase;

class CourseCommentResourceTest extends ApiTestCase
{
    use ResetDatabase;
    use Factories;

    public function testGetCollectionOfComments(): void
    {
        CourseCommentFactory::createMany(5);
        $json = $this->browser()
            ->get('/api/course_comments')
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
//            'creator',
            'createdAt',
            'updatedAt',
        ]);
    }

    public function testGetOneComment(): void
    {
        $comment = CourseCommentFactory::createOne();

        $this->browser()
            ->get('/api/course_comments/'.$comment->getId())
            ->assertJson()
            ->assertJsonMatches('"@id"', '/api/course_comments/'.$comment->getId());
    }

    public function testGetCommentFilterByContent(): void
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
            ->get('/api/course_comments?content=comment2')
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
            ->get('/api/course_comments?content=comment')
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3)
        ;
    }

    public function testGetCourseFilterByAnonymous(): void
    {
        CourseCommentFactory::createMany(3, [
            'anonymous' => true,
        ]);
        CourseCommentFactory::createMany(5, [
            'anonymous' => false,
        ]);

        $this->browser()
            ->get('/api/course_comments?anonymous=true')
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3)
            ->get('/api/course_comments?anonymous=false')
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 5)
            ->assertJsonMatches('length("hydra:member")', 5)
        ;
    }
}