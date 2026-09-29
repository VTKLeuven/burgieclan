<?php

namespace App\Tests\Service\Collab;

use App\Entity\CollabDocument;
use App\Repository\CollabDocumentRevisionRepository;
use App\Service\Collab\CollabDocumentStore;
use DateTimeImmutable;
use LogicException;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

class CollabDocumentStoreTest extends KernelTestCase
{
    private CollabDocumentStore $store;
    private CollabDocumentRevisionRepository $revisions;

    protected function setUp(): void
    {
        $this->store = self::getContainer()->get(CollabDocumentStore::class);
        $this->revisions = self::getContainer()->get(CollabDocumentRevisionRepository::class);
    }

    /**
     * @return list<string>
     */
    private function revisionStates(CollabDocument $document): array
    {
        return array_reverse(
            array_map(
                static fn($revision): string => $revision->getState(),
                $this->revisions->findForDocument($document)
            )
        );
    }

    public function testKeepsAtMostOneRevisionPerIntervalOfEditing(): void
    {
        $start = new DateTimeImmutable();

        $document = $this->store->store('collab-test', 'v1', null, null, [1], $start);
        $this->assertSame([], $this->revisionStates($document));

        // The first follow-up store keeps what was there before it.
        $this->store->store('collab-test', 'v2', null, null, [2], $start->modify('+2 seconds'));
        $this->assertSame(['v1'], $this->revisionStates($document));

        // Stores within the interval replace the document without adding revisions.
        $this->store->store('collab-test', 'v3', null, null, [2], $start->modify('+5 minutes'));
        $this->store->store('collab-test', 'v4', null, null, [3], $start->modify('+9 minutes'));
        $this->assertSame(['v1'], $this->revisionStates($document));

        // Once the interval has passed, the version from before this store is kept, with
        // everyone who edited since the previous revision.
        $this->store->store('collab-test', 'v5', null, null, [4], $start->modify('+11 minutes'));
        $this->assertSame(['v1', 'v4'], $this->revisionStates($document));

        $latest = $this->revisions->findLatest($document);
        $this->assertSame([2, 3], $latest?->getContributors());
        $this->assertSame([4], $document->getPendingContributors());
        $this->assertSame('v5', $document->getState());
    }

    /**
     * The case the interval is designed around: a document that was quiet for a day gets
     * vandalised. The version from before the vandal's first edit must survive.
     */
    public function testTheVersionBeforeAQuietDocumentIsChangedAgainIsKept(): void
    {
        $start = new DateTimeImmutable();
        $document = $this->store->store('collab-test', 'v1', null, null, [1], $start);
        $this->store->store('collab-test', 'good', null, null, [1], $start->modify('+1 minute'));

        $this->store->store('collab-test', 'vandalised', null, null, [66], $start->modify('+1 day'));

        $this->assertSame(['v1', 'good'], $this->revisionStates($document));
        $this->assertSame([66], $document->getPendingContributors());
    }

    public function testASnapshotOfAnUnchangedDocumentIsSkipped(): void
    {
        $document = $this->store->store('collab-test', 'v1', null, null, [], new DateTimeImmutable());

        $this->assertNotNull($this->store->snapshot($document, 'Before restoring'));
        self::getContainer()->get('doctrine.orm.entity_manager')->flush();
        $this->assertNull($this->store->snapshot($document, 'Before restoring again'));
    }

    public function testCopyingNeverOverwritesAnExistingDocument(): void
    {
        $this->store->store('collab-test', 'v1', null, null, [], new DateTimeImmutable());
        $this->store->store('exam-1', 'other', null, null, [], new DateTimeImmutable());

        $this->expectException(LogicException::class);
        $this->store->copy('collab-test', 'exam-1');
    }
}
