<?php

namespace App\Tests\Api;

use App\Entity\Exam;
use App\Factory\CourseFactory;
use App\Factory\DocumentFactory;
use App\Factory\ExamFactory;
use App\Factory\ModuleFactory;
use App\Factory\ProgramFactory;
use App\Service\Collab\CollabDocumentStore;

class SearchResourceTest extends ApiTestCase
{
    public function testSearch(): void
    {
        CourseFactory::createMany(5);
        $course = CourseFactory::createOne(
            [
                'name' => 'CoursewitUniqueName1',
            ]
        );
        ModuleFactory::createMany(5);
        $module = ModuleFactory::createOne(
            [
                'name' => 'ModulewitUniqueName1',
            ]
        );
        ProgramFactory::createMany(5);
        $program = ProgramFactory::createOne(
            [
                'name' => 'ProgramwitUniqueName1',
            ]
        );
        DocumentFactory::createMany(5);
        $document = DocumentFactory::createOne(
            [
                'name' => 'DocumentwitUniqueName1',
            ]
        );

        $json = $this->browser()
            ->get('/api/search?searchText=rsewitUnique')
            ->assertStatus(401)
            ->get(
                '/api/search?searchText=rsewitUnique',
                [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->token
                    ]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->json();

        $decoded_json = $json->decoded();
        $this->assertSame(
            array_keys($decoded_json),
            [
                '@context',
                '@id',
                '@type',
                'courses',
                'modules',
                'programs',
                'documents',
                'examQuestions',
            ]
        );
        $courses = $decoded_json['courses'];
        $this->assertSame(1, count($courses));
        $this->assertSame('/api/courses/' . $course->getId(), $courses[0]['@id']);

        $json = $this->browser()
            ->get('/api/search?searchText=ulewitUniqueNa')
            ->assertStatus(401)
            ->get(
                '/api/search?searchText=ulewitUniqueName1',
                [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->token
                    ]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->json();

        $decoded_json = $json->decoded();
        $this->assertSame(
            array_keys($decoded_json),
            [
                '@context',
                '@id',
                '@type',
                'courses',
                'modules',
                'programs',
                'documents',
                'examQuestions',
            ]
        );
        $modules = $decoded_json['modules'];
        $this->assertSame(1, count($modules));
        $this->assertSame('/api/modules/' . $module->getId(), $modules[0]['@id']);

        $json = $this->browser()
            ->get('/api/search?searchText=gramwitUniqueNa')
            ->assertStatus(401)
            ->get(
                '/api/search?searchText=gramwitUniqueNa',
                [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->token
                    ]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->json();

        $decoded_json = $json->decoded();
        $this->assertSame(
            array_keys($decoded_json),
            [
                '@context',
                '@id',
                '@type',
                'courses',
                'modules',
                'programs',
                'documents',
                'examQuestions',
            ]
        );
        $programs = $decoded_json['programs'];
        $this->assertSame(1, count($programs));
        $this->assertSame('/api/programs/' . $program->getId(), $programs[0]['@id']);

        $json = $this->browser()
            ->get('/api/search?searchText=umentwitUniqueN')
            ->assertStatus(401)
            ->get(
                '/api/search?searchText=umentwitUniqueN',
                [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->token
                    ]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->json();

        $decoded_json = $json->decoded();
        $this->assertSame(
            array_keys($decoded_json),
            [
                '@context',
                '@id',
                '@type',
                'courses',
                'modules',
                'programs',
                'documents',
                'examQuestions',
            ]
        );
        $documents = $decoded_json['documents'];
        $this->assertSame(1, count($documents));
        $this->assertSame('/api/documents/' . $document->getId(), $documents[0]['@id']);

        $json = $this->browser()
            ->get('/api/search?searchText=gwrergergherg')
            ->assertStatus(401)
            ->get(
                '/api/search?searchText=gwrergergherg',
                [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->token
                    ]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->json();

        $decoded_json = $json->decoded();
        $this->assertSame(
            array_keys($decoded_json),
            [
                '@context',
                '@id',
                '@type',
                'courses',
                'modules',
                'programs',
                'documents',
                'examQuestions',
            ]
        );
        $courses = $decoded_json['courses'];
        $modules = $decoded_json['modules'];
        $programs = $decoded_json['programs'];
        $documents = $decoded_json['documents'];
        $this->assertSame(0, count($courses));
        $this->assertSame(0, count($modules));
        $this->assertSame(0, count($programs));
        $this->assertSame(0, count($documents));
    }

    public function testSearchIsCaseInsensitive(): void
    {
        // Regression: on PostgreSQL a plain LIKE is case-sensitive, so a lowercase query used to
        // miss differently-cased names. Searching "zzq..." (lowercase) must find "ZZQ..." (mixed).
        $program = ProgramFactory::createOne(['name' => 'ZZQUniqueProgramName']);
        $course = CourseFactory::createOne(['name' => 'ZZQUniqueCourseName', 'code' => 'H0R12A']);

        $decoded_json = $this->browser()
            ->get(
                '/api/search?searchText=zzquniqueprogram',
                ['headers' => ['Authorization' => 'Bearer ' . $this->token]]
            )
            ->assertStatus(200)
            ->assertJson()
            ->json()
            ->decoded();

        $this->assertSame(1, count($decoded_json['programs']));
        $this->assertSame('/api/programs/' . $program->getId(), $decoded_json['programs'][0]['@id']);

        // A lowercase query matching the (uppercase) course code must also hit case-insensitively.
        $decoded_json = $this->browser()
            ->get(
                '/api/search?searchText=h0r12a',
                ['headers' => ['Authorization' => 'Bearer ' . $this->token]]
            )
            ->assertStatus(200)
            ->assertJson()
            ->json()
            ->decoded();

        $this->assertSame(1, count($decoded_json['courses']));
        $this->assertSame('/api/courses/' . $course->getId(), $decoded_json['courses'][0]['@id']);
    }

    public function testAllSearchTermsMustMatch(): void
    {
        $course = CourseFactory::createOne(
            [
                'name' => 'Energy conversion machines and systems',
                'nameNl' => 'Energieconversiemachines en -systemen',
                'nameEn' => 'Energy conversion machines and systems',
                'code' => 'H01N2A',
            ]
        );
        CourseFactory::createOne(['name' => 'Algemene natuurkunde en toepassingen']);

        $decodedJson = $this->browser()
            ->get(
                '/api/search?searchText=Energieconversiemachines%20en%20-systemen',
                ['headers' => ['Authorization' => 'Bearer ' . $this->token]]
            )
            ->assertStatus(200)
            ->assertJson()
            ->json()
            ->decoded();

        $this->assertCount(1, $decodedJson['courses']);
        $this->assertSame('/api/courses/' . $course->getId(), $decodedJson['courses'][0]['@id']);

        // The upload selector calls this same endpoint with partial input. Keep the concrete
        // regression from the UI: "energiecon" must find the localized Dutch course title.
        $decodedJson = $this->browser()
            ->get(
                '/api/search?searchText=energiecon',
                ['headers' => ['Authorization' => 'Bearer ' . $this->token]]
            )
            ->assertStatus(200)
            ->assertJson()
            ->json()
            ->decoded();

        $this->assertCount(1, $decodedJson['courses']);
        $this->assertSame('/api/courses/' . $course->getId(), $decodedJson['courses'][0]['@id']);
    }

    /**
     * Stores the exam's document as the collab server would, with one question per uid => text.
     *
     * @param array<string, string> $questions
     */
    private static function storeQuestions(Exam $exam, array $questions): void
    {
        $content = ['type' => 'doc', 'content' => []];
        foreach ($questions as $uid => $text) {
            $content['content'][] = [
                'type' => 'examQuestion',
                'attrs' => ['id' => $uid],
                'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => $text]]]],
            ];
        }
        self::getContainer()->get(CollabDocumentStore::class)
            ->store($exam->getDocumentName(), 'state', $content, null, []);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function searchExamQuestions(string $text): array
    {
        return $this->browser()
            ->get(
                '/api/search?searchText=' . rawurlencode($text),
                ['headers' => ['Authorization' => 'Bearer ' . $this->token]]
            )
            ->assertStatus(200)
            ->json()
            ->decoded()['examQuestions'];
    }

    public function testSearchFindsExamQuestions(): void
    {
        $analysis = CourseFactory::createOne(
            ['name' => 'Analyse I', 'nameNl' => 'Analyse I', 'nameEn' => 'Analysis I', 'code' => 'H01A0B']
        );
        $chemistry = CourseFactory::createOne(['name' => 'Algemene chemie', 'code' => 'H01C0A']);
        $exam = ExamFactory::createOne(['course' => $analysis]);
        self::storeQuestions(
            $exam,
            ['q1' => 'Bewijs de stelling van Rolle met een tekening.', 'q2' => 'Bereken de limiet.']
        );
        $otherExam = ExamFactory::createOne(['course' => $chemistry]);
        self::storeQuestions($otherExam, ['c1' => 'Leg de reactie volgens Rolle uit.']);

        // A term in the question finds it in any course, case-insensitively.
        $this->assertEqualsCanonicalizing(['q1', 'c1'], array_column($this->searchExamQuestions('ROLLE'), 'uid'));

        // A term in the course narrows it down, and the hit has what the page needs to link to it.
        $hits = $this->searchExamQuestions('analyse rolle');
        $this->assertCount(1, $hits);
        $this->assertSame('q1', $hits[0]['uid']);
        $this->assertSame('Bewijs de stelling van Rolle met een tekening.', $hits[0]['snippet']);
        $this->assertSame($exam->getId(), $hits[0]['examId']);
        $this->assertSame($exam->getAcademicYear(), $hits[0]['academicYear']);
        $this->assertSame('january', $hits[0]['period']);
        $this->assertSame('/api/courses/' . $analysis->getId(), $hits[0]['course']['@id']);
        $this->assertSame('H01A0B', $hits[0]['course']['code']);

        // Only the course: that lists the course, not every question of it.
        $this->assertSame([], $this->searchExamQuestions('analyse'));

        // A question that was removed from the document is no longer found.
        self::storeQuestions($exam, ['q2' => 'Bereken de limiet.']);
        $this->assertSame(['c1'], array_column($this->searchExamQuestions('rolle'), 'uid'));
    }
}
