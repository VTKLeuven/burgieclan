<?php

namespace App\Repository;

use App\Entity\DocumentComment;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<DocumentComment>
 *
 * @method DocumentComment|null find($id, $lockMode = null, $lockVersion = null)
 * @method DocumentComment|null findOneBy(array $criteria, array $orderBy = null)
 * @method DocumentComment[]    findAll()
 * @method DocumentComment[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class DocumentCommentRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, DocumentComment::class);
    }

//    /**
//     * @return DocumentComment[] Returns an array of DocumentComment objects
//     */
//    public function findByExampleField($value): array
//    {
//        return $this->createQueryBuilder('d')
//            ->andWhere('d.exampleField = :val')
//            ->setParameter('val', $value)
//            ->orderBy('d.id', 'ASC')
//            ->setMaxResults(10)
//            ->getQuery()
//            ->getResult()
//        ;
//    }

//    public function findOneBySomeField($value): ?DocumentComment
//    {
//        return $this->createQueryBuilder('d')
//            ->andWhere('d.exampleField = :val')
//            ->setParameter('val', $value)
//            ->getQuery()
//            ->getOneOrNullResult()
//        ;
//    }
}
