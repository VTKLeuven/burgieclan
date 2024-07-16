<?php

namespace App\Repository;

use App\Entity\CourseComment;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<CourseComment>
 *
 * @method CourseComment|null find($id, $lockMode = null, $lockVersion = null)
 * @method CourseComment|null findOneBy(array $criteria, array $orderBy = null)
 * @method CourseComment[]    findAll()
 * @method CourseComment[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class CourseCommentRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, CourseComment::class);
    }

    public function save(CourseComment $entity, bool $flush = false): void
    {
        $this->getEntityManager()->persist($entity);

        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    public function remove(CourseComment $entity, bool $flush = false): void
    {
        $this->getEntityManager()->remove($entity);

        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }
}
