<?php

namespace App\Repository;

use App\Entity\ExchangeDestination;
use App\Entity\ExchangeReport;
use App\Entity\ExchangeReportHelpful;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ExchangeReport>
 *
 * @method ExchangeReport|null find($id, $lockMode = null, $lockVersion = null)
 * @method ExchangeReport|null findOneBy(array $criteria, array $orderBy = null)
 * @method ExchangeReport[]    findAll()
 * @method ExchangeReport[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class ExchangeReportRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ExchangeReport::class);
    }

    /**
     * Per destination id: how many approved reports it has and the latest academic year among them.
     *
     * @return array<int, array{count: int, lastYear: string}>
     */
    public function summaryPerDestination(): array
    {
        $rows = $this->createQueryBuilder('r')
            ->select('IDENTITY(r.destination) AS destination', 'COUNT(r.id) AS reports', 'MAX(r.academicYear) AS lastYear')
            ->andWhere('r.underReview = false')
            ->groupBy('r.destination')
            ->getQuery()
            ->getArrayResult();

        $summary = [];
        foreach ($rows as $row) {
            $summary[(int) $row['destination']] = ['count' => (int) $row['reports'], 'lastYear' => (string) $row['lastYear']];
        }

        return $summary;
    }

    /**
     * The latest approved reports, newest first, for "Laatst gedeeld".
     *
     * @return list<ExchangeReport>
     */
    public function findLatestApproved(int $limit): array
    {
        /** @var list<ExchangeReport> */
        return $this->createQueryBuilder('r')
            ->addSelect('d')
            ->join('r.destination', 'd')
            ->andWhere('r.underReview = false')
            ->andWhere('d.approved = true')
            ->orderBy('r.createdAt', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }

    /**
     * A destination's approved reports and the user's own ones still under review, newest
     * exchange first.
     *
     * @return list<ExchangeReport>
     */
    public function findForDestination(ExchangeDestination $destination, User $user): array
    {
        /** @var list<ExchangeReport> */
        return $this->createQueryBuilder('r')
            ->andWhere('r.destination = :destination')
            ->andWhere('r.underReview = false OR r.author = :user')
            ->setParameter('destination', $destination)
            ->setParameter('user', $user)
            ->orderBy('r.academicYear', 'DESC')
            ->addOrderBy('r.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * "Nuttig" counts for these reports, and which parts this user marked.
     *
     * @param list<ExchangeReport> $reports
     *
     * @return array{counts: array<int, array<string, int>>, mine: array<int, list<string>>}
     */
    public function helpfulFor(array $reports, User $user): array
    {
        $result = ['counts' => [], 'mine' => []];
        if ([] === $reports) {
            return $result;
        }

        $rows = $this->getEntityManager()->createQueryBuilder()
            ->select('IDENTITY(h.report) AS report', 'h.part', 'COUNT(h.id) AS total')
            ->addSelect('SUM(CASE WHEN h.user = :user THEN 1 ELSE 0 END) AS mine')
            ->from(ExchangeReportHelpful::class, 'h')
            ->andWhere('h.report IN (:reports)')
            ->setParameter('reports', $reports)
            ->setParameter('user', $user)
            ->groupBy('h.report', 'h.part')
            ->getQuery()
            ->getArrayResult();

        foreach ($rows as $row) {
            $report = (int) $row['report'];
            $result['counts'][$report][(string) $row['part']] = (int) $row['total'];
            if ((int) $row['mine'] > 0) {
                $result['mine'][$report][] = (string) $row['part'];
            }
        }

        return $result;
    }

    public function countUnderReview(): int
    {
        return $this->count(['underReview' => true]);
    }
}
