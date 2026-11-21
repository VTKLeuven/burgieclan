<?php

namespace App\Tests\Api;

use App\Constants\Feature;
use App\Entity\Exam;
use App\Factory\ExamFactory;
use App\Repository\FeatureFlagRepository;
use App\Service\Collab\CollabDocumentStore;
use App\Service\Feature\FeatureFlags;

/**
 * Exam reconstructions are switched off unless an admin turns them on: the API then behaves as if
 * they did not exist. The other exam tests switch the feature on in their setUp.
 */
class FeatureFlagTest extends ApiTestCase
{
    public function testFeaturesArePublicAndOffByDefault(): void
    {
        $features = $this->browser()
            ->get('/api/features')
            ->assertStatus(200)
            ->json()
            ->decoded();

        $this->assertSame([Feature::EXAM_RECONSTRUCTIONS->value => false, Feature::EXCHANGE->value => false], $features);
    }

    public function testAnEnabledFeatureIsReported(): void
    {
        self::enableFeature(Feature::EXAM_RECONSTRUCTIONS);

        $features = $this->browser()->get('/api/features')->assertStatus(200)->json()->decoded();

        $this->assertTrue($features[Feature::EXAM_RECONSTRUCTIONS->value]);
    }

    public function testExamRoutesAreNotFoundWhileOff(): void
    {
        $exam = ExamFactory::createOne();
        $auth = ['headers' => ['Authorization' => 'Bearer ' . $this->token]];

        $this->browser()->get('/api/exams', $auth)->assertStatus(404);
        $this->browser()->get('/api/exams/' . $exam->getId(), $auth)->assertStatus(404);
        $this->browser()->get('/api/exams/' . $exam->getId() . '/question_stats', $auth)->assertStatus(404);
        $this->browser()->get('/api/exams/' . $exam->getId() . '/image-urls', $auth)->assertStatus(404);
        $this->browser()->get('/api/exam_question_comments', $auth)->assertStatus(404);
    }

    public function testExamRoutesWorkOnceOn(): void
    {
        self::enableFeature(Feature::EXAM_RECONSTRUCTIONS);
        $exam = ExamFactory::createOne();

        $this->browser()
            ->get('/api/exams/' . $exam->getId(), ['headers' => ['Authorization' => 'Bearer ' . $this->token]])
            ->assertStatus(200);
    }

    public function testNoCollabTokenForAnExamWhileOff(): void
    {
        $exam = ExamFactory::createOne();

        $options = [
            'headers' => ['Authorization' => 'Bearer ' . $this->token],
            'json' => ['document' => $exam->getDocumentName()],
        ];

        $this->browser()->post('/api/collab/token', $options)->assertStatus(403);
    }

    public function testSearchLeavesOutExamQuestionsWhileOff(): void
    {
        $exam = ExamFactory::createOne();
        self::storeQuestion($exam, 'Leg de stelling van Rolle uit.');

        $results = $this->browser()
            ->get('/api/search?searchText=rolle', ['headers' => ['Authorization' => 'Bearer ' . $this->token]])
            ->assertStatus(200)
            ->json()
            ->decoded();

        $this->assertSame([], $results['examQuestions']);
    }

    public function testEnsureRowsAddsEveryFeatureSwitchedOff(): void
    {
        $flags = self::getContainer()->get(FeatureFlags::class);
        $flags->ensureRows();
        $flags->ensureRows();

        $rows = self::getContainer()->get(FeatureFlagRepository::class)->findAll();
        $this->assertCount(count(Feature::cases()), $rows);
        foreach ($rows as $row) {
            $this->assertFalse($row->isEnabled());
        }
    }

    private static function storeQuestion(Exam $exam, string $text): void
    {
        $content = ['type' => 'doc', 'content' => [[
            'type' => 'examQuestion',
            'attrs' => ['id' => 'q1'],
            'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => $text]]]],
        ]]];
        self::getContainer()->get(CollabDocumentStore::class)
            ->store($exam->getDocumentName(), 'state', $content, null, []);
    }
}
