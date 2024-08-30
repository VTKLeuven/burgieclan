<?php

namespace App\Repository;

use App\Entity\DocumentVote;
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

    public function save(DocumentVote $entity, bool $flush = false): void
    {
        $this->getEntityManager()->persist($entity);

        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    public function remove(DocumentVote $entity, bool $flush = false): void
    {
        $this->getEntityManager()->remove($entity);

        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }
}
