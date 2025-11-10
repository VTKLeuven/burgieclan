<?php

namespace App\Repository;

use App\Entity\CourseComment;
use App\Entity\CourseCommentVote;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<CourseCommentVote>
 *
 * @method CourseCommentVote|null find($id, $lockMode = null, $lockVersion = null)
 * @method CourseCommentVote|null findOneBy(array $criteria, array $orderBy = null)
 * @method CourseCommentVote[]    findAll()
 * @method CourseCommentVote[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class CourseCommentVoteRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, CourseCommentVote::class);
    }

    /**
     * Find a user's vote on a specific course comment
     */
    public function findUserVoteForCourseComment(User $user, CourseComment $courseComment): ?CourseCommentVote
    {
        return $this->createQueryBuilder('v')
            ->andWhere('v.creator = :user')
            ->andWhere('v.courseComment = :courseComment')
            ->setParameter('user', $user)
            ->setParameter('courseComment', $courseComment)
            ->getQuery()
            ->getOneOrNullResult();
    }

    /**
     * Get all votes for a specific course comment
     *
     * @return CourseCommentVote[]
     */
    public function findVotesForCourseComment(CourseComment $courseComment): array
    {
        return $this->createQueryBuilder('v')
            ->andWhere('v.courseComment = :courseComment')
            ->setParameter('courseComment', $courseComment)
            ->orderBy('v.createDate', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Get vote statistics for a specific course comment
     *
     * @return array{upvotes: int, downvotes: int, score: int}
     */
    public function getVoteStatsForCourseComment(CourseComment $courseComment): array
    {
        $result = $this->createQueryBuilder('v')
            ->select(
                '
                SUM(CASE WHEN v.voteType = :upvote THEN 1 ELSE 0 END) as upvotes,
                SUM(CASE WHEN v.voteType = :downvote THEN 1 ELSE 0 END) as downvotes,
                SUM(v.voteType) as score
            '
            )
            ->andWhere('v.courseComment = :courseComment')
            ->setParameter('courseComment', $courseComment)
            ->setParameter('upvote', CourseCommentVote::UPVOTE)
            ->setParameter('downvote', CourseCommentVote::DOWNVOTE)
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
     * @return CourseCommentVote[]
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
