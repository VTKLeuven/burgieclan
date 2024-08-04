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
}
