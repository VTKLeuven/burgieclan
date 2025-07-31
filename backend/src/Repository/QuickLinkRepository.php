<?php

/*
 * This file is part of the Symfony package.
 *
 * (c) Fabien Potencier <fabien@symfony.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace App\Repository;

use App\Entity\QuickLink;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<QuickLink>
 *
 * @method QuickLink|null find($id, $lockMode = null, $lockVersion = null)
 * @method QuickLink|null findOneBy(array $criteria, array $orderBy = null)
 * @method QuickLink[]    findAll()
 * @method QuickLink[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class QuickLinkRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, QuickLink::class);
    }
}
