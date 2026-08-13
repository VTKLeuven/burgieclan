<?php

namespace App\Repository;

use App\Entity\FaqQuestion;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\ORM\NonUniqueResultException;
use Doctrine\ORM\NoResultException;
use Doctrine\Persistence\ManagerRegistry;
use Psr\Log\LoggerInterface;

/**
 * @extends ServiceEntityRepository <FaqQuestion>
 *
 * @method FaqQuestion|null find($id, $lockMode = null, $lockVersion = null)
 * @method FaqQuestion|null findOneBy(array $criteria, array $orderBy = null)
 * @method FaqQuestion[]    findAll()
 * @method FaqQuestion[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class FaqQuestionRepository extends ServiceEntityRepository
{
    public function __construct(
        ManagerRegistry $registry,
        private readonly LoggerInterface $logger
    ) {
        parent::__construct($registry, FaqQuestion::class);
    }

    /**
     * Number of questions nobody has dealt with yet, for the admin menu badge.
     *
     * @return float|bool|int|string
     */
    public function getAmountNew(): float|bool|int|string
    {
        try {
            return $this->createQueryBuilder('q')
                ->select('count(q.id)')
                ->andWhere('q.status = :status')
                ->setParameter('status', FaqQuestion::STATUS_NEW)
                ->getQuery()
                ->getSingleScalarResult() ?? 0;
        } catch (NoResultException | NonUniqueResultException $e) {
            $this->logger->warning(
                'Error counting new FAQ questions',
                [
                    'error' => $e->getMessage()
                ]
            );

            return 0;
        }
    }
}
