<?php

namespace App\Repository;

use App\Entity\Page;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Page>
 *
 * @method Page|null find($id, $lockMode = null, $lockVersion = null)
 * @method Page|null findOneBy(array $criteria, array $orderBy = null)
 * @method Page[]    findAll()
 * @method Page[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class PageRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Page::class);
    }

    public function findAllPublicAvailable(): array
    {
        return $this->createQueryBuilder('p')
            ->andWhere('p.publicAvailable = :public')
            ->setParameter('public', true)
            ->getQuery()
            ->getResult();
    }

    public function findOneByUrlKey(string $urlKey): ?Page
    {
        return $this->createQueryBuilder('p')
            ->andWhere('p.urlKey = :urlKey')
            ->setParameter('urlKey', $urlKey)
            ->getQuery()
            ->getOneOrNullResult();
    }
}
