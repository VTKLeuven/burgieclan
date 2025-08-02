<?php

namespace App\Repository;

use App\Entity\Professor;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Professor>
 *
 * @method Professor|null find($id, $lockMode = null, $lockVersion = null)
 * @method Professor|null findOneBy(array $criteria, array $orderBy = null)
 * @method Professor[]    findAll()
 * @method Professor[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class ProfessorRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Professor::class);
    }

    public function findByUNumber(string $uNumber): ?Professor
    {
        return $this->findOneBy(['uNumber' => $uNumber]);
    }

    /**
     * Find professors that need updating (older than specified time)
     */
    public function findOutdated(\DateTimeInterface $threshold): array
    {
        return $this->createQueryBuilder('p')
            ->where('p.lastUpdated IS NULL OR p.lastUpdated < :threshold')
            ->setParameter('threshold', $threshold)
            ->getQuery()
            ->getResult();
    }

    /**
     * Find professors by name (partial match)
     */
    public function findByNameLike(string $name): array
    {
        return $this->createQueryBuilder('p')
            ->where('p.name LIKE :name')
            ->setParameter('name', '%' . $name . '%')
            ->orderBy('p.name', 'ASC')
            ->getQuery()
            ->getResult();
    }
}