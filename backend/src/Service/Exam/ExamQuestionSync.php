<?php

namespace App\Service\Exam;

use App\Entity\Exam;
use App\Entity\ExamQuestion;
use App\Repository\ExamQuestionRepository;
use App\Utils\ExamContent;
use DateTimeImmutable;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Keeps the exam_question rows of an exam in step with its live document.
 *
 * Called with every JSON copy of the document that reaches the database (CollabDocumentStore),
 * rollbacks included, since those come back through the collab server as a normal store. The
 * copy is written by browsers, so it is read defensively: a question without a usable uid is
 * skipped, and when two questions share a uid, which pasting can cause for a moment, the first
 * one wins.
 */
class ExamQuestionSync
{
    public function __construct(
        private readonly ExamQuestionRepository $questions,
        private readonly EntityManagerInterface $entityManager,
    ) {}

    /**
     * Upserts the questions of $content by uid, and marks the ones that are no longer in it as
     * removed. Does not flush.
     *
     * @param array<string, mixed>|null $content TipTap JSON, as CollabDocument::getContent()
     */
    public function sync(Exam $exam, ?array $content, ?DateTimeImmutable $now = null): void
    {
        $existing = $this->questions->findAllByUid($exam);
        $seen = [];
        $position = 0;

        foreach (ExamContent::questions($content) as $question) {
            $uid = $question['uid'];
            if (null === $uid || mb_strlen($uid) > ExamQuestion::MAX_UID_LENGTH || isset($seen[$uid])) {
                continue;
            }
            $seen[$uid] = true;

            $row = $existing[$uid] ?? null;
            if (null === $row) {
                $row = new ExamQuestion($exam, $uid);
                $this->entityManager->persist($row);
            }

            $row->setPosition($position++)
                ->setText($question['text'])
                ->setSittings($question['sittings'])
                ->setRemovedAt(null);
        }

        foreach ($existing as $uid => $row) {
            if (!isset($seen[$uid]) && !$row->isRemoved()) {
                $row->setRemovedAt($now ?? new DateTimeImmutable());
            }
        }
    }
}
