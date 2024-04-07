<?php

namespace App\Tests\Api;

use App\Factory\CourseFactory;
use Zenstruck\Foundry\Test\Factories;
use Zenstruck\Foundry\Test\ResetDatabase;

class CourseResourceTest extends ApiTestCase
{
    use ResetDatabase;
    use Factories;

    public function testGetCollectionOfCourses(): void
    {
        CourseFactory::createMany(5);
        $json = $this->browser()
            ->get('/api/courses')
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 5)
            ->assertJsonMatches('length("hydra:member")', 5)
            ->json()
        ;

        $this->assertSame(array_keys($json->decoded()['hydra:member'][0]), [
            '@id',
            '@type',
            'name',
            'code',
            'professors',
            'semesters',
            'credits',
            'oldCourses',
            'newCourses',
            'modules',
            'courseComments',
        ]);
    }

    public function testGetOneCourse(): void
    {
        $course = CourseFactory::createOne();

        $this->browser()
            ->get('/api/courses/'.$course->getId())
            ->assertJson()
            ->assertJsonMatches('"@id"', '/api/courses/'.$course->getId());
    }
}