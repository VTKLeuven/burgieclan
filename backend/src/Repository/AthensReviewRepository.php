<?php

namespace App\Repository;

use App\Entity\AthensCourse;
use App\Entity\AthensReview;
use App\Entity\AthensUniversity;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<AthensReview>
 *
 * @method AthensReview|null find($id, $lockMode = null, $lockVersion = null)
 * @method AthensReview|null findOneBy(array $criteria, array $orderBy = null)
 * @method AthensReview[]    findAll()
 * @method AthensReview[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class AthensReviewRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, AthensReview::class);
    }

    /**
     * Per course id: how many approved reviews it has and their average score.
     *
     * @return array<int, array{count: int, rating: float}>
     */
    public function summaryPerCourse(): array
    {
        $rows = $this->createQueryBuilder('r')
            ->select('IDENTITY(r.course) AS course', 'COUNT(r.id) AS reviews', 'AVG(r.rating) AS rating')
            ->andWhere('r.underReview = false')
            ->groupBy('r.course')
            ->getQuery()
            ->getArrayResult();

        $summary = [];
        foreach ($rows as $row) {
            $summary[(int) $row['course']] = ['count' => (int) $row['reviews'], 'rating' => round((float) $row['rating'], 1)];
        }

        return $summary;
    }

    /**
     * The latest approved reviews of courses still in the catalogue, newest first.
     *
     * @return list<AthensReview>
     */
    public function findLatestApproved(int $limit): array
    {
        /** @var list<AthensReview> */
        return $this->createQueryBuilder('r')
            ->addSelect('c', 'u')
            ->join('r.course', 'c')
            ->join('c.university', 'u')
            ->andWhere('r.underReview = false')
            ->andWhere('c.active = true')
            ->orderBy('r.createdAt', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }

    /**
     * A course's approved reviews and the user's own ones still under review, newest session first.
     *
     * @return list<AthensReview>
     */
    public function findForCourse(AthensCourse $course, User $user): array
    {
        /** @var list<AthensReview> */
        return $this->createQueryBuilder('r')
            ->andWhere('r.course = :course')
            ->andWhere('r.underReview = false OR r.author = :user')
            ->setParameter('course', $course)
            ->setParameter('user', $user)
            ->orderBy('r.session', 'DESC')
            ->addOrderBy('r.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Approved reviews of the university's other courses, also the ones no longer in the catalogue:
     * what they say about the city and the practical side holds for every course there.
     *
     * @return list<AthensReview>
     */
    public function findApprovedAtUniversity(AthensUniversity $university, AthensCourse $except, int $limit): array
    {
        /** @var list<AthensReview> */
        return $this->createQueryBuilder('r')
            ->addSelect('c')
            ->join('r.course', 'c')
            ->andWhere('c.university = :university')
            ->andWhere('c != :except')
            ->andWhere('r.underReview = false')
            ->setParameter('university', $university)
            ->setParameter('except', $except)
            ->orderBy('r.session', 'DESC')
            ->addOrderBy('r.createdAt', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }

    public function countUnderReview(): int
    {
        return $this->count(['underReview' => true]);
    }
}
