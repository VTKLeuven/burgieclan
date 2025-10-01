<?php

namespace App\Repository;

use App\Entity\Document;
use App\Entity\DocumentVote;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<DocumentVote>
 *
 * @method DocumentVote|null find($id, $lockMode = null, $lockVersion = null)
 * @method DocumentVote|null findOneBy(array $criteria, array $orderBy = null)
 * @method DocumentVote[]    findAll()
 * @method DocumentVote[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class DocumentVoteRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, DocumentVote::class);
    }

    /**
     * Find a user's vote on a specific document
     */
    public function findUserVoteForDocument(User $user, Document $document): ?DocumentVote
    {
        return $this->createQueryBuilder('v')
            ->andWhere('v.creator = :user')
            ->andWhere('v.document = :document')
            ->setParameter('user', $user)
            ->setParameter('document', $document)
            ->getQuery()
            ->getOneOrNullResult();
    }

    /**
     * Get all votes for a specific document
     *
     * @return DocumentVote[]
     */
    public function findVotesForDocument(Document $document): array
    {
        return $this->createQueryBuilder('v')
            ->andWhere('v.document = :document')
            ->setParameter('document', $document)
            ->orderBy('v.createDate', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Get vote statistics for a specific document
     *
     * @return array{upvotes: int, downvotes: int, score: int}
     */
    public function getVoteStatsForDocument(Document $document): array
    {
        $result = $this->createQueryBuilder('v')
            ->select('
                SUM(CASE WHEN v.voteType = :upvote THEN 1 ELSE 0 END) as upvotes,
                SUM(CASE WHEN v.voteType = :downvote THEN 1 ELSE 0 END) as downvotes,
                SUM(v.voteType) as score
            ')
            ->andWhere('v.document = :document')
            ->setParameter('document', $document)
            ->setParameter('upvote', DocumentVote::UPVOTE)
            ->setParameter('downvote', DocumentVote::DOWNVOTE)
            ->getQuery()
            ->getSingleResult();

        return [
            'upvotes' => (int) ($result['upvotes'] ?? 0),
            'downvotes' => (int) ($result['downvotes'] ?? 0),
            'score' => (int) ($result['score'] ?? 0),
        ];
    }

    /**
     * Get all votes by a specific user
     *
     * @return DocumentVote[]
     */
    public function findVotesByUser(User $user): array
    {
        return $this->createQueryBuilder('v')
            ->andWhere('v.creator = :user')
            ->setParameter('user', $user)
            ->orderBy('v.createDate', 'DESC')
            ->getQuery()
            ->getResult();
    }
}
