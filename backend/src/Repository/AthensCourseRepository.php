<?php

namespace App\Repository;

use App\Entity\AthensCourse;
use App\Entity\AthensUniversity;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<AthensCourse>
 *
 * @method AthensCourse|null find($id, $lockMode = null, $lockVersion = null)
 * @method AthensCourse|null findOneBy(array $criteria, array $orderBy = null)
 * @method AthensCourse[]    findAll()
 * @method AthensCourse[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class AthensCourseRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, AthensCourse::class);
    }

    /**
     * The courses of the current catalogue with their universities, by university and title.
     *
     * @return list<AthensCourse>
     */
    public function findActive(): array
    {
        /** @var list<AthensCourse> */
        return $this->createQueryBuilder('c')
            ->addSelect('u')
            ->join('c.university', 'u')
            ->andWhere('c.active = true')
            ->orderBy('u.name', 'ASC')
            ->addOrderBy('c.title', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * The other courses of the current catalogue at the same university.
     *
     * @return list<AthensCourse>
     */
    public function findActiveAt(AthensUniversity $university, AthensCourse $except): array
    {
        /** @var list<AthensCourse> */
        return $this->createQueryBuilder('c')
            ->andWhere('c.university = :university')
            ->andWhere('c.active = true')
            ->andWhere('c != :except')
            ->setParameter('university', $university)
            ->setParameter('except', $except)
            ->orderBy('c.title', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
