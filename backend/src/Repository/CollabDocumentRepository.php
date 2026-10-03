<?php

namespace App\Repository;

use App\Entity\CollabDocument;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<CollabDocument>
 *
 * @method CollabDocument|null find($id, $lockMode = null, $lockVersion = null)
 * @method CollabDocument|null findOneBy(array $criteria, array $orderBy = null)
 * @method CollabDocument[]    findAll()
 * @method CollabDocument[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class CollabDocumentRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, CollabDocument::class);
    }

    public function findOneByName(string $name): ?CollabDocument
    {
        return $this->findOneBy(['name' => $name]);
    }
}
