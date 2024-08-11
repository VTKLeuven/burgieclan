<?php

namespace App\Repository;

use App\Entity\CourseCommentVote;
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

    public function save(CourseCommentVote $entity, bool $flush = false): void
    {
        $this->getEntityManager()->persist($entity);

        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    public function remove(CourseCommentVote $entity, bool $flush = false): void
    {
        $this->getEntityManager()->remove($entity);

        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }
}
