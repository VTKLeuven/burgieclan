<?php

namespace App\Service\Collab;

use App\Entity\CollabDocument;
use App\Entity\CollabDocumentRevision;
use App\Repository\CollabDocumentRepository;
use App\Repository\CollabDocumentRevisionRepository;
use DateTimeImmutable;
use Doctrine\ORM\EntityManagerInterface;
use LogicException;

/**
 * Writes live documents to the database and keeps their history.
 *
 * The collab server stores a document every few seconds while people edit it. Keeping every one
 * of those would be noise, so a revision is taken at most once per SNAPSHOT_INTERVAL. The
 * revision holds the state as it was *before* the store that triggered it: that is the end of the
 * previous stretch of editing. So when a vandal opens a document that was quiet for a day, the
 * version from before their first edit is kept, not their result.
 */
class CollabDocumentStore
{
    public const SNAPSHOT_INTERVAL = '10 minutes';

    public function __construct(
        private readonly CollabDocumentRepository $documents,
        private readonly CollabDocumentRevisionRepository $revisions,
        private readonly EntityManagerInterface $entityManager,
    ) {}

    /**
     * Stores what the collab server sent. Only the collab server may call this (see
     * Controller\Internal\CollabDocumentController), never anything that edits content.
     *
     * @param array<string, mixed>|null $content
     * @param array<string, mixed>|null $fields
     * @param int[] $contributors ids of the users who changed the document since the last store
     */
    public function store(
        string $name,
        string $state,
        ?array $content,
        ?array $fields,
        array $contributors,
        ?DateTimeImmutable $now = null
    ): CollabDocument {
        $document = $this->documents->findOneByName($name);

        if (null === $document) {
            $document = new CollabDocument($name, $state);
            $this->entityManager->persist($document);
        } else {
            if ($this->isSnapshotDue($document, $now ?? new DateTimeImmutable())) {
                $this->snapshot($document);
            }
            $document->setState($state);
        }

        $document->setContent($content);
        $document->setFields($fields);
        $document->addPendingContributors($contributors);

        $this->entityManager->flush();

        return $document;
    }

    /**
     * Keeps the document as it is stored right now as a revision, unless the latest revision
     * already holds exactly this state. Does not flush.
     */
    public function snapshot(CollabDocument $document, ?string $note = null): ?CollabDocumentRevision
    {
        $latest = $this->revisions->findLatest($document);
        if (null !== $latest && $latest->getState() === $document->getState()) {
            return null;
        }

        $revision = new CollabDocumentRevision($document, $document->takePendingContributors(), $note);
        $this->entityManager->persist($revision);

        return $revision;
    }

    /**
     * Gives a new document the exact state of another one, e.g. when a reconstruction starts as a
     * copy of an earlier exam. Copying the Yjs bytes is only safe because nobody can have the new
     * document open yet; never use this to overwrite a document that already exists.
     *
     * Does nothing when the source was never stored (it is empty). Does not flush.
     */
    public function copy(string $fromName, string $toName): ?CollabDocument
    {
        if (null !== $this->documents->findOneByName($toName)) {
            throw new LogicException(sprintf('Document "%s" already exists; copying over it would lose it.', $toName));
        }

        $source = $this->documents->findOneByName($fromName);
        if (null === $source) {
            return null;
        }

        $copy = new CollabDocument($toName, $source->getState());
        $copy->setContent($source->getContent());
        $copy->setFields($source->getFields());
        $this->entityManager->persist($copy);

        return $copy;
    }

    /**
     * Removes a document and its history, e.g. when its exam is deleted. Does not flush.
     */
    public function remove(string $name): void
    {
        $document = $this->documents->findOneByName($name);
        if (null === $document) {
            return;
        }

        foreach ($this->revisions->findBy(['document' => $document]) as $revision) {
            $this->entityManager->remove($revision);
        }
        $this->entityManager->remove($document);
    }

    private function isSnapshotDue(CollabDocument $document, DateTimeImmutable $now): bool
    {
        $latest = $this->revisions->findLatest($document);

        return null === $latest || $latest->getCreatedAt() <= $now->modify('-' . self::SNAPSHOT_INTERVAL);
    }
}
