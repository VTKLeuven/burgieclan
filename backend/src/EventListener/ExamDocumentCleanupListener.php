<?php

namespace App\EventListener;

use App\Entity\Exam;
use App\Service\Collab\CollabDocumentStore;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsEntityListener;
use Doctrine\ORM\Events;

/**
 * Deleting an exam also deletes its live document and that document's history: the document is
 * only linked by name, so the database cannot cascade it.
 *
 * Runs on EntityManager::remove(), before the flush, so everything goes in one transaction. A
 * course deleted straight in the database cascades to its exams without passing here; the
 * documents left behind are then unreachable, but harmless.
 */
#[AsEntityListener(event: Events::preRemove, method: 'preRemove', entity: Exam::class)]
class ExamDocumentCleanupListener
{
    public function __construct(
        private readonly CollabDocumentStore $store,
    ) {}

    public function preRemove(Exam $exam): void
    {
        $this->store->remove($exam->getDocumentName());
    }
}
