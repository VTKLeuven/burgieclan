<?php

namespace App\Tests\Api;

use App\Factory\CourseFactory;
use App\Factory\DocumentCategoryFactory;
use App\Factory\DocumentFactory;
use App\Factory\ModuleFactory;
use App\Factory\ProgramFactory;

use function Zenstruck\Foundry\Persistence\save;

class CourseResourceTest extends ApiTestCase
{
    public function testGetCollectionOfCourses(): void
    {
        CourseFactory::createMany(5);
        $json = $this->browser()
            ->get('/api/courses')
            ->assertStatus(401)
            ->get(
                '/api/courses',
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
                'name',
                'code',
                'language',
                'professors',
                'semesters',
                'credits',
                'identicalCourses',
                'oldCourses',
                'newCourses',
                'modules',
                'courseComments',
                'documentCounts',
                'createdAt',
                'updatedAt',
            ],
            array_keys($json->decoded()['hydra:member'][0])
        );
    }


    public function testGetOneCourse(): void
    {
        $course = CourseFactory::createOne();

        $this->browser()
            ->get(
                '/api/courses/' . $course->getId(),
                [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->token
                    ]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"@id"', '/api/courses/' . $course->getId());
    }

    /**
     * The exact-key assertion above passes with these absent because API Platform omits nulls, so
     * it does not prove they are exposed. Set them and check they reach the client.
     */
    public function testGetCourseExposesBothLanguageTitles(): void
    {
        $course = CourseFactory::createOne(
            [
            'name' => 'Distributed Systems',
            'nameNl' => 'Gedistribueerde systemen',
            'nameEn' => 'Distributed Systems',
            ]
        );

        $this->browser()
            ->get(
                '/api/courses/' . $course->getId(),
                [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->token
                    ]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('nameNl', 'Gedistribueerde systemen')
            ->assertJsonMatches('nameEn', 'Distributed Systems');
    }

    public function testGetCourseFilterByName(): void
    {
        $course1 = CourseFactory::createOne(
            [
                'name' => 'Course1',
            ]
        );

        $course2 = CourseFactory::createOne(
            [
                'name' => 'Course2',
            ]
        );

        $course3 = CourseFactory::createOne(
            [
                'name' => 'Course3',
            ]
        );

        CourseFactory::createMany(5);

        $this->browser()
            ->get(
                '/api/courses?name=course2',
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
                '/api/courses?name=course',
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

    public function testGetCourseFilterByCode(): void
    {
        $course1 = CourseFactory::createOne(
            [
                'code' => 'code1',
            ]
        );

        $course2 = CourseFactory::createOne(
            [
                'code' => 'code2',
            ]
        );

        $course3 = CourseFactory::createOne(
            [
                'code' => 'code3',
            ]
        );

        CourseFactory::createMany(5);

        $this->browser()
            ->get(
                '/api/courses?code=code2',
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
                '/api/courses?code=code',
                [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->token
                    ]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3);
    }

    public function testGetCourseExposesRelatedCourseCodeAndName(): void
    {
        // Related courses are rendered as clickable badges on the course page, so an
        // embedded course has to carry its code and name and not just an IRI. Mapping
        // them at MAX_DEPTH 0 skips populate() and leaves both null while the key
        // assertions in testGetCollectionOfCourses still pass.
        $old = CourseFactory::createOne(['name' => 'Fluidummechanica', 'code' => 'H08W4A']);
        $course = CourseFactory::createOne(['name' => 'Transportverschijnselen', 'code' => 'H0R12A']);
        $course->addOldCourse($old);
        save($course);

        $json = $this->browser()
            ->get(
                '/api/courses/' . $course->getId(),
                [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->token
                    ]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->json()->decoded();

        $this->assertCount(1, $json['oldCourses']);
        $this->assertSame('H08W4A', $json['oldCourses'][0]['code']);
        $this->assertSame('Fluidummechanica', $json['oldCourses'][0]['name']);
    }

    public function testGetCourseSummarySkipsExpensiveRelationsAndDocumentCounts(): void
    {
        $old = CourseFactory::createOne();
        $course = CourseFactory::createOne();
        $course->addOldCourse($old);
        save($course);
        DocumentFactory::createOne(['course' => $course, 'under_review' => false]);

        $json = $this->browser()
            ->get(
                '/api/courses/' . $course->getId() . '?summary=true',
                [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->token
                    ]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->json()->decoded();

        $this->assertSame($course->getName(), $json['name']);
        $this->assertSame([], $json['oldCourses']);
        $this->assertSame([], $json['courseComments']);
        $this->assertSame([], $json['documentCounts']);
    }

    public function testGetCourseExposesDocumentCountsByCategory(): void
    {
        $course = CourseFactory::createOne();
        $category1 = DocumentCategoryFactory::createOne();
        $category2 = DocumentCategoryFactory::createOne();

        DocumentFactory::createMany(
            3,
            [
            'course' => $course,
            'category' => $category1,
            'under_review' => false,
            ]
        );
        DocumentFactory::createMany(
            2,
            [
            'course' => $course,
            'category' => $category2,
            'under_review' => false,
            ]
        );
        DocumentFactory::createOne(
            [
            'course' => $course,
            'category' => $category1,
            'under_review' => true,
            ]
        );

        $json = $this->browser()
            ->get(
                '/api/courses/' . $course->getId(),
                [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->token
                    ]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->json()->decoded();

        $this->assertArrayHasKey('documentCounts', $json);
        $this->assertSame(3, $json['documentCounts'][$category1->getId()]);
        $this->assertSame(2, $json['documentCounts'][$category2->getId()]);
    }

    /**
     * A course page is reached from a search, a favourite or a shared link, none of which say
     * which branch the reader is in. The paths endpoint is what lets it say so anyway.
     */
    public function testGetCoursePaths(): void
    {
        $course = CourseFactory::createOne(['modules' => []]);
        $program = ProgramFactory::createOne();
        $leaf = ModuleFactory::createOne(['program' => null, 'modules' => [], 'courses' => [$course]]);
        $top = ModuleFactory::createOne(['program' => $program, 'modules' => [$leaf]]);

        $this->browser()
            ->get('/api/courses/' . $course->getId() . '/paths')
            ->assertStatus(401)
            ->get(
                '/api/courses/' . $course->getId() . '/paths',
                [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->token
                    ]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('length(paths)', 1)
            ->assertJsonMatches('paths[0].program."@id"', '/api/programs/' . $program->getId())
            ->assertJsonMatches('paths[0].program.name', $program->getName())
            ->assertJsonMatches(
                'paths[0].modules[*]."@id"',
                [
                    '/api/modules/' . $top->getId(),
                    '/api/modules/' . $leaf->getId(),
                ]
            );
    }

    /**
     * Half the engineering courses are shared, and the reader wants to know about all of them -
     * "am I looking at the right Beton?" only has an answer if every placement is listed.
     */
    public function testGetCoursePathsListsEveryPlacement(): void
    {
        $course = CourseFactory::createOne(['modules' => []]);
        $first = ProgramFactory::createOne(['name' => 'A program']);
        $second = ProgramFactory::createOne(['name' => 'B program']);
        ModuleFactory::createOne(['program' => $first, 'modules' => [], 'courses' => [$course]]);
        ModuleFactory::createOne(['program' => $second, 'modules' => [], 'courses' => [$course]]);

        $this->browser()
            ->get(
                '/api/courses/' . $course->getId() . '/paths',
                [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->token
                    ]
                ]
            )
            ->assertStatus(200)
            ->assertJsonMatches('length(paths)', 2)
            // Ordered by program name, so the list does not reshuffle between requests.
            ->assertJsonMatches('paths[*].program.name', ['A program', 'B program']);
    }

    /**
     * A course whose modules hang under no program is drawn nowhere in the navigator, so there
     * is no branch to name - and an empty list is the honest answer, not a 404.
     */
    public function testGetCoursePathsOfCourseOutsideAnyProgram(): void
    {
        $course = CourseFactory::createOne(['modules' => []]);
        ModuleFactory::createOne(['program' => null, 'modules' => [], 'courses' => [$course]]);

        $this->browser()
            ->get(
                '/api/courses/' . $course->getId() . '/paths',
                [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->token
                    ]
                ]
            )
            ->assertStatus(200)
            ->assertJsonMatches('paths', []);
    }

    public function testGetCoursePathsOfUnknownCourse(): void
    {
        $this->browser()
            ->get(
                '/api/courses/999999/paths',
                [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->token
                    ]
                ]
            )
            ->assertStatus(404);
    }

    /**
     * After a curriculum reform the current code is nearly empty while its predecessor holds
     * years of exams. Without the count on the link, nothing tells the reader that.
     */
    public function testRelatedCoursesCarryTheirDocumentCount(): void
    {
        $predecessor = CourseFactory::createOne();
        $course = CourseFactory::createOne(['oldCourses' => [$predecessor]]);
        $category = DocumentCategoryFactory::createOne();

        DocumentFactory::createMany(
            3,
            [
            'course' => $predecessor,
            'category' => $category,
            'under_review' => false,
            ]
        );
        // Pending uploads are invisible everywhere else, so they must not pad the count here.
        DocumentFactory::createOne(
            [
            'course' => $predecessor,
            'category' => $category,
            'under_review' => true,
            ]
        );

        $this->browser()
            ->get(
                '/api/courses/' . $course->getId(),
                [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->token
                    ]
                ]
            )
            ->assertStatus(200)
            ->assertJsonMatches('oldCourses[0]."@id"', '/api/courses/' . $predecessor->getId())
            ->assertJsonMatches('oldCourses[0].documentCount', 3);
    }
}
