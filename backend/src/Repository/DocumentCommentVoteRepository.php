<?php

namespace App\Repository;

use App\Entity\DocumentCommentVote;
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

    public function save(DocumentCommentVote $entity, bool $flush = false): void
    {
        $this->getEntityManager()->persist($entity);

        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    public function remove(DocumentCommentVote $entity, bool $flush = false): void
    {
        $this->getEntityManager()->remove($entity);

        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }
}
