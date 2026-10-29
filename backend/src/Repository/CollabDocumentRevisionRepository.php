<?php

namespace App\Repository;

use App\Entity\CollabDocument;
use App\Entity\CollabDocumentRevision;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<CollabDocumentRevision>
 */
class CollabDocumentRevisionRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, CollabDocumentRevision::class);
    }

    public function findLatest(CollabDocument $document): ?CollabDocumentRevision
    {
        return $this->findOneBy(['document' => $document], ['createdAt' => 'DESC', 'id' => 'DESC']);
    }

    /**
     * Newest first.
     *
     * @return CollabDocumentRevision[]
     */
    public function findForDocument(CollabDocument $document, int $limit = 200): array
    {
        return $this->findBy(['document' => $document], ['createdAt' => 'DESC', 'id' => 'DESC'], $limit);
    }

    /**
     * @return list<int>
     */
    public function findIdsForDocument(CollabDocument $document): array
    {
        /** @var list<int> $ids */
        $ids = $this->createQueryBuilder('r')
            ->select('r.id')
            ->where('r.document = :document')
            ->setParameter('document', $document)
            ->getQuery()
            ->getSingleColumnResult();

        return array_map('intval', $ids);
    }
}
