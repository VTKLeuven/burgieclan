<?php

namespace App\Tests\Service\Exam;

use App\Constants\ExamPeriod;
use App\Entity\CollabDocument;
use App\Entity\Exam;
use App\Entity\ExamQuestion;
use App\Factory\ExamFactory;
use App\Repository\ExamQuestionRepository;
use App\Service\Collab\CollabDocumentStore;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Console\Application;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\Component\Console\Tester\CommandTester;
use Zenstruck\Foundry\Test\ResetDatabase;

/**
 * The exam_question rows follow what the collab server stores, through CollabDocumentStore.
 */
class ExamQuestionSyncTest extends KernelTestCase
{
    use ResetDatabase;

    private CollabDocumentStore $store;
    private ExamQuestionRepository $questions;

    protected function setUp(): void
    {
        self::bootKernel();
        $this->store = self::getContainer()->get(CollabDocumentStore::class);
        $this->questions = self::getContainer()->get(ExamQuestionRepository::class);
    }

    /**
     * @param array<string, array{0: string, 1: list<string>}> $questions uid => [text, days]
     *
     * @return array<string, mixed> TipTap JSON with one examQuestion per entry
     */
    private static function content(array $questions): array
    {
        $nodes = [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'Algemene info']]]];
        foreach ($questions as $uid => [$text, $sittings]) {
            $nodes[] = [
                'type' => 'examQuestion',
                'attrs' => ['id' => $uid, 'sittings' => $sittings],
                'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => $text]]]],
            ];
        }

        return ['type' => 'doc', 'content' => $nodes];
    }

    /**
     * @param array<string, mixed> $content
     */
    private function storeFor(Exam $exam, array $content): void
    {
        $this->store->store($exam->getDocumentName(), 'state', $content, null, []);
    }

    /**
     * @return array<string, array{position: int, text: string, sittings: list<string>, removed: bool}>
     */
    private function rows(Exam $exam): array
    {
        self::getContainer()->get(EntityManagerInterface::class)->clear();

        $rows = [];
        foreach ($this->questions->findAllByUid($exam) as $uid => $question) {
            $rows[$uid] = [
                'position' => $question->getPosition(),
                'text' => $question->getText(),
                'sittings' => $question->getSittings(),
                'removed' => $question->isRemoved(),
            ];
        }
        ksort($rows);

        return $rows;
    }

    public function testStoringAnExamCopiesItsQuestions(): void
    {
        $exam = ExamFactory::createOne();

        $this->storeFor(
            $exam,
            self::content(['a' => ['Bewijs de stelling', ['d1']], 'b' => ['Bereken de limiet', []]])
        );

        $this->assertSame(
            [
                'a' => ['position' => 0, 'text' => 'Bewijs de stelling', 'sittings' => ['d1'], 'removed' => false],
                'b' => ['position' => 1, 'text' => 'Bereken de limiet', 'sittings' => [], 'removed' => false],
            ],
            $this->rows($exam)
        );
    }

    public function testEditsReordersAndRemovalsFollowTheDocument(): void
    {
        $exam = ExamFactory::createOne();
        $this->storeFor($exam, self::content(['a' => ['Vraag A', []], 'b' => ['Vraag B', []], 'c' => ['Vraag C', []]]));

        // b is edited and moved to the front, c is deleted.
        $this->storeFor($exam, self::content(['b' => ['Vraag B, beter', ['d1']], 'a' => ['Vraag A', []]]));

        $rows = $this->rows($exam);
        $this->assertSame(
            ['position' => 0, 'text' => 'Vraag B, beter', 'sittings' => ['d1'], 'removed' => false],
            $rows['b']
        );
        $this->assertSame(1, $rows['a']['position']);
        // Removed, not deleted, and it keeps its last position.
        $this->assertSame(['position' => 2, 'text' => 'Vraag C', 'sittings' => [], 'removed' => true], $rows['c']);

        // A rollback brings it back as the same row.
        $this->storeFor($exam, self::content(['a' => ['Vraag A', []], 'b' => ['Vraag B', []], 'c' => ['Vraag C', []]]));
        $this->assertFalse($this->rows($exam)['c']['removed']);
        $this->assertCount(3, $this->questions->findBy(['exam' => $exam->getId()]));
    }

    public function testDuplicateAndMissingIdsAreSkipped(): void
    {
        $exam = ExamFactory::createOne();
        $content = self::content(['a' => ['Eerste', []]]);
        // A paste can briefly duplicate a question, uid included; the first one wins.
        $content['content'][] = $content['content'][1];
        $content['content'][2]['content'][0]['content'][0]['text'] = 'Kopie';
        $content['content'][] = ['type' => 'examQuestion', 'attrs' => ['sittings' => []], 'content' => []];
        $content['content'][] = ['type' => 'examQuestion', 'attrs' => ['id' => str_repeat('x', 65)], 'content' => []];

        $this->storeFor($exam, $content);

        $this->assertSame(
            ['a' => ['position' => 0, 'text' => 'Eerste', 'sittings' => [], 'removed' => false]],
            $this->rows($exam)
        );
    }

    public function testUidsAreUniquePerExamSoACopyKeepsThem(): void
    {
        $source = ExamFactory::createOne();
        $this->storeFor($source, self::content(['a' => ['Vraag A', []]]));
        $copy = ExamFactory::createOne(
            ['course' => $source->getCourse(), 'period' => ExamPeriod::JUNE, 'copiedFrom' => $source]
        );

        $this->store->copy($source->getDocumentName(), $copy->getDocumentName());
        self::getContainer()->get(EntityManagerInterface::class)->flush();

        $this->assertSame(['a'], array_keys($this->rows($copy)));
        $this->assertSame(['a'], array_keys($this->rows($source)));
    }

    public function testOtherDocumentsHaveNoQuestions(): void
    {
        $this->store->store('collab-test', 'state', self::content(['a' => ['Vraag', []]]), null, []);

        $this->assertSame(0, $this->questions->count([]));
    }

    public function testTheCommandSyncsExamsNobodyEditedYet(): void
    {
        $exam = ExamFactory::createOne();
        // Stored before exam_question existed: a document without rows.
        $document = new CollabDocument($exam->getDocumentName(), 'state');
        $document->setContent(self::content(['a' => ['Vraag A', []], 'b' => ['Vraag B', []]]));
        $entityManager = self::getContainer()->get(EntityManagerInterface::class);
        $entityManager->persist($document);
        $entityManager->flush();
        $this->assertSame([], $this->rows($exam));

        $command = new CommandTester((new Application(self::$kernel))->find('app:exam-questions:sync'));
        $command->execute([]);

        $command->assertCommandIsSuccessful();
        $this->assertSame(['a', 'b'], array_keys($this->rows($exam)));
        $this->assertInstanceOf(ExamQuestion::class, $this->questions->findCurrent($exam)[1]);
        $this->assertSame('b', $this->questions->findCurrent($exam)[1]->getUid());
    }
}
