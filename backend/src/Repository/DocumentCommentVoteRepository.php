<?php

namespace App\Repository;

use App\Entity\DocumentComment;
use App\Entity\DocumentCommentVote;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<DocumentCommentVote>
 *
 * @method DocumentCommentVote|null find($id, $lockMode = null, $lockVersion = null)
 * @method DocumentCommentVote|null findOneBy(array $criteria, array $orderBy = null)
 * @method DocumentCommentVote[]    findAll()
 * @method DocumentCommentVote[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class DocumentCommentVoteRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, DocumentCommentVote::class);
    }

    /**
     * Find a user's vote on a specific document comment
     */
    public function findUserVoteForDocumentComment(User $user, DocumentComment $documentComment): ?DocumentCommentVote
    {
        return $this->createQueryBuilder('v')
            ->andWhere('v.creator = :user')
            ->andWhere('v.documentComment = :documentComment')
            ->setParameter('user', $user)
            ->setParameter('documentComment', $documentComment)
            ->getQuery()
            ->getOneOrNullResult();
    }

    /**
     * Get all votes for a specific document comment
     *
     * @return DocumentCommentVote[]
     */
    public function findVotesForDocumentComment(DocumentComment $documentComment): array
    {
        return $this->createQueryBuilder('v')
            ->andWhere('v.documentComment = :documentComment')
            ->setParameter('documentComment', $documentComment)
            ->orderBy('v.createDate', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Get vote statistics for a specific document comment
     *
     * @return array{upvotes: int, downvotes: int, score: int}
     */
    public function getVoteStatsForDocumentComment(DocumentComment $documentComment): array
    {
        $result = $this->createQueryBuilder('v')
            ->select(
                '
                SUM(CASE WHEN v.voteType = :upvote THEN 1 ELSE 0 END) as upvotes,
                SUM(CASE WHEN v.voteType = :downvote THEN 1 ELSE 0 END) as downvotes,
                SUM(v.voteType) as score
            '
            )
            ->andWhere('v.documentComment = :documentComment')
            ->setParameter('documentComment', $documentComment)
            ->setParameter('upvote', DocumentCommentVote::UPVOTE)
            ->setParameter('downvote', DocumentCommentVote::DOWNVOTE)
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
     * @return DocumentCommentVote[]
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
