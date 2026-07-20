<?php

namespace App\Repository;

use App\Entity\FaqItem;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository <FaqItem>
 *
 * @method FaqItem|null find($id, $lockMode = null, $lockVersion = null)
 * @method FaqItem|null findOneBy(array $criteria, array $orderBy = null)
 * @method FaqItem[]    findAll()
 * @method FaqItem[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class FaqItemRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, FaqItem::class);
    }
}
