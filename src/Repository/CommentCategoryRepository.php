<?php

namespace App\Repository;

use App\Entity\CommentCategory;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<CommentCategory>
 *
 * @method CommentCategory|null find($id, $lockMode = null, $lockVersion = null)
 * @method CommentCategory|null findOneBy(array $criteria, array $orderBy = null)
 * @method CommentCategory[]    findAll()
 * @method CommentCategory[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class CommentCategoryRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, CommentCategory::class);
    }

    public function save(CommentCategory $entity, bool $flush = false): void
    {
        $this->getEntityManager()->persist($entity);

        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    public function remove(CommentCategory $entity, bool $flush = false): void
    {
        $this->getEntityManager()->remove($entity);

        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }
}
