<?php

namespace App\Service\Collab;

use App\Repository\ExamRepository;
use App\Security\Voter\CollabDocumentVoter;

/**
 * Which live documents may exist: those that belong to something, like an exam.
 *
 * The collab server only opens documents Symfony issued a token for, but a document can lose its
 * owner while it is open, e.g. when a moderator deletes the exam. Its next store is then refused,
 * instead of bringing the deleted document back as an orphan row.
 */
class CollabDocumentOwners
{
    public function __construct(
        private readonly ExamRepository $exams,
    ) {}

    public function exists(string $documentName): bool
    {
        return CollabDocumentVoter::TEST_DOCUMENT === $documentName
            || null !== $this->exams->findByDocumentName($documentName);
    }
}
