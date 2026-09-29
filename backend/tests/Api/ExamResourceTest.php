<?php

namespace App\Tests\Api;

use App\Constants\AcademicYear;
use App\Constants\ExamPeriod;
use App\Entity\CollabDocument;
use App\Entity\Exam;
use App\Factory\CourseFactory;
use App\Factory\ExamFactory;
use App\Repository\CollabDocumentRepository;
use App\Repository\ExamRepository;
use DateTimeImmutable;
use Doctrine\ORM\EntityManagerInterface;
use Zenstruck\Browser\KernelBrowser;

class ExamResourceTest extends ApiTestCase
{
    private const QUESTIONS = [
        'type' => 'doc',
        'content' => [
            ['type' => 'examQuestion', 'attrs' => ['id' => 'q1', 'sittings' => ['d1']], 'content' => [
                ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'Bewijs de stelling van Rolle.']]],
            ]],
            ['type' => 'examQuestion', 'attrs' => ['id' => 'q2', 'sittings' => []], 'content' => [
                ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'Leid af.']]],
            ]],
        ],
    ];

    /** Last year's January exams: always started, whatever today is. */
    private static function lastYear(): string
    {
        return AcademicYear::format(AcademicYear::currentStartYear() - 1);
    }

    /**
     * @param array<string, mixed> $json
     */
    private function start(array $json): KernelBrowser
    {
        return $this->browser()->post(
            '/api/exams',
            [
            'headers' => ['Authorization' => 'Bearer ' . $this->token, 'Content-Type' => 'application/ld+json'],
            'json' => $json,
            ]
        );
    }

    private function get(string $url): KernelBrowser
    {
        return $this->browser()->get($url, ['headers' => ['Authorization' => 'Bearer ' . $this->token]]);
    }

    private function storeDocument(string $name, string $state, array $content, array $fields = []): void
    {
        $document = new CollabDocument($name, $state);
        $document->setContent($content);
        $document->setFields($fields);

        $entityManager = self::getContainer()->get(EntityManagerInterface::class);
        $entityManager->persist($document);
        $entityManager->flush();
    }

    public function testRequiresLogin(): void
    {
        $this->browser()->get('/api/exams')->assertStatus(401);
    }

    public function testStartingAReconstruction(): void
    {
        $course = CourseFactory::createOne();

        $response = $this->start(
            [
            'course' => '/api/courses/' . $course->getId(),
            'academicYear' => self::lastYear(),
            'period' => 'june',
            ]
        )
            ->assertStatus(201)
            ->assertJsonMatches('course."@id"', '/api/courses/' . $course->getId())
            ->assertJsonMatches('academicYear', self::lastYear())
            ->assertJsonMatches('period', 'june')
            ->assertJsonMatches('questionCount', 0)
            ->json()
            ->decoded();

        $id = (int) basename($response['@id']);
        $this->assertSame('exam-' . $id, $response['documentName']);

        // Last year's June exams ended long ago, so it gets two weeks from now instead.
        $editableUntil = new DateTimeImmutable($response['editableUntil']);
        $this->assertTrue($response['editable']);
        $this->assertGreaterThan(new DateTimeImmutable('+13 days'), $editableUntil);
        $this->assertLessThanOrEqual(new DateTimeImmutable('+14 days'), $editableUntil);

        $exam = self::getContainer()->get(ExamRepository::class)->find($id);
        $this->assertNotNull($exam?->getCreator());
    }

    public function testAPeriodThatHasNotStartedCannotBeStarted(): void
    {
        $course = CourseFactory::createOne();
        $nextYear = AcademicYear::format(AcademicYear::currentStartYear() + 1);

        $this->start(['course' => '/api/courses/' . $course->getId(), 'academicYear' => $nextYear, 'period' => 'january'])
            ->assertStatus(422)
            ->assertJsonMatches('violations[0].propertyPath', 'period');
    }

    public function testThereIsOneReconstructionPerExam(): void
    {
        $course = CourseFactory::createOne();
        $json = ['course' => '/api/courses/' . $course->getId(), 'academicYear' => self::lastYear(), 'period' => 'august'];

        $this->start($json)->assertStatus(201);
        $this->start($json)
            ->assertStatus(422)
            ->assertJsonMatches('violations[0].propertyPath', 'period');

        // Another period of the same year is a different exam.
        $this->start(['period' => 'june'] + $json)->assertStatus(201);
    }

    public function testMalformedRequestsAreRejected(): void
    {
        $course = CourseFactory::createOne();
        $iri = '/api/courses/' . $course->getId();

        $this->start(['course' => $iri, 'academicYear' => self::lastYear(), 'period' => 'march'])->assertStatus(422);
        $this->start(['course' => $iri, 'academicYear' => '2024-2025', 'period' => 'june'])->assertStatus(422);
        $this->start(['academicYear' => self::lastYear(), 'period' => 'june'])->assertStatus(422);
    }

    public function testListingTheReconstructionsOfACourse(): void
    {
        $course = CourseFactory::createOne();
        $other = CourseFactory::createOne();
        ExamFactory::createOne(['course' => $course, 'period' => ExamPeriod::JANUARY]);
        ExamFactory::createOne(['course' => $course, 'period' => ExamPeriod::JUNE]);
        ExamFactory::createOne(['course' => $other]);

        $this->get('/api/exams?course=/api/courses/' . $course->getId())
            ->assertStatus(200)
            ->assertJsonMatches('"hydra:totalItems"', 2)
            ->assertJsonMatches('"hydra:member"[0].content', null);
    }

    public function testAnExamShowsItsStoredQuestionsAndDays(): void
    {
        $exam = ExamFactory::createOne();
        $this->storeDocument(
            $exam->getDocumentName(),
            "\x01\x02",
            self::QUESTIONS,
            [
            'sittings' => [['id' => 'd1', 'label' => 'ma 20 jan'], ['id' => 'd2', 'label' => 'di 21 jan']],
            ]
        );

        $response = $this->get('/api/exams/' . $exam->getId())
            ->assertStatus(200)
            ->assertJsonMatches('questionCount', 2)
            ->assertJsonMatches('sittings[1].label', 'di 21 jan')
            ->assertJsonMatches('content.content[0].attrs.sittings[0]', 'd1')
            ->json()
            ->decoded();

        $this->assertArrayNotHasKey('creator', $response);
    }

    public function testALockedExamSaysSo(): void
    {
        $exam = ExamFactory::createOne(['editableUntil' => new DateTimeImmutable('-1 minute')]);

        $this->get('/api/exams/' . $exam->getId())
            ->assertStatus(200)
            ->assertJsonMatches('editable', false);
    }

    public function testStartingAsACopyOfAnotherExam(): void
    {
        $course = CourseFactory::createOne();
        $january = ExamFactory::createOne(['course' => $course, 'academicYear' => self::lastYear()]);
        $this->storeDocument($january->getDocumentName(), "yjs\x00state", self::QUESTIONS, ['sittings' => []]);

        $response = $this->start(
            [
            'course' => '/api/courses/' . $course->getId(),
            'academicYear' => self::lastYear(),
            'period' => 'june',
            'copiedFrom' => '/api/exams/' . $january->getId(),
            ]
        )
            ->assertStatus(201)
            ->assertJsonMatches('copiedFrom."@id"', '/api/exams/' . $january->getId())
            ->assertJsonMatches('questionCount', 2)
            ->json()
            ->decoded();

        $copy = self::getContainer()->get(CollabDocumentRepository::class)->findOneByName($response['documentName']);
        $this->assertSame("yjs\x00state", $copy?->getState());
        $this->assertSame(self::QUESTIONS, $copy->getContent());
    }

    public function testCopyingAnExamThatIsStillEmptyStartsEmpty(): void
    {
        $course = CourseFactory::createOne();
        $january = ExamFactory::createOne(['course' => $course]);

        $this->start(
            [
            'course' => '/api/courses/' . $course->getId(),
            'academicYear' => self::lastYear(),
            'period' => 'june',
            'copiedFrom' => '/api/exams/' . $january->getId(),
            ]
        )
            ->assertStatus(201)
            ->assertJsonMatches('questionCount', 0);
    }

    public function testOnlyAnExamOfTheSameCourseCanBeCopied(): void
    {
        $other = ExamFactory::createOne();
        $course = CourseFactory::createOne();

        $this->start(
            [
            'course' => '/api/courses/' . $course->getId(),
            'academicYear' => self::lastYear(),
            'period' => 'june',
            'copiedFrom' => '/api/exams/' . $other->getId(),
            ]
        )
            ->assertStatus(422)
            ->assertJsonMatches('violations[0].propertyPath', 'copiedFrom');
    }

    public function testDeletingAnExamDeletesItsDocument(): void
    {
        $exam = ExamFactory::createOne();
        $name = $exam->getDocumentName();
        $this->storeDocument($name, "\x01", self::QUESTIONS);

        $entityManager = self::getContainer()->get(EntityManagerInterface::class);
        $entityManager->remove($entityManager->find(Exam::class, $exam->getId()));
        $entityManager->flush();

        $this->assertNull(self::getContainer()->get(CollabDocumentRepository::class)->findOneByName($name));
    }
}
