<?php

namespace App\Repository;

use App\Entity\CommentCategory;
use App\Entity\Course;
use App\Entity\CourseRating;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<CourseRating>
 *
 * @method CourseRating|null find($id, $lockMode = null, $lockVersion = null)
 * @method CourseRating|null findOneBy(array $criteria, array $orderBy = null)
 * @method CourseRating[]    findAll()
 * @method CourseRating[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class CourseRatingRepository extends ServiceEntityRepository
{
    /**
     * Below this many scores an average is noise rather than information.
     *
     * It is also a privacy floor: some courses have single-digit enrolment, and an average over
     * one person is that person's opinion with their name filed off.
     */
    public const MIN_RATINGS_FOR_AN_AVERAGE = 3;

    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, CourseRating::class);
    }

    public function findUserRating(Course $course, CommentCategory $category, User $creator): ?CourseRating
    {
        return $this->findOneBy(['course' => $course, 'category' => $category, 'creator' => $creator]);
    }

    /**
     * Average and count per rated section for one course, optionally limited to a set of years.
     *
     * One query for every axis rather than one per axis: a course page shows all of them at
     * once, so per-axis queries would mean a round trip each.
     *
     * The average is returned as null below MIN_RATINGS_FOR_AN_AVERAGE, so the threshold lives
     * in one place instead of every client having to remember to hide a thin number.
     *
     * @param string[]|null $years null means every year
     * @return array<int, array{average: float|null, count: int}> keyed by category id
     */
    public function summaryForCourse(Course $course, ?array $years = null): array
    {
        $qb = $this->createQueryBuilder('r')
            ->select('IDENTITY(r.category) AS categoryId, AVG(r.value) AS average, COUNT(r.id) AS ratingCount')
            ->andWhere('r.course = :course')
            ->setParameter('course', $course)
            ->groupBy('r.category');

        if (null !== $years) {
            // An empty year list means "no years match", not "every year".
            if ([] === $years) {
                return [];
            }
            $qb->andWhere('r.academicYear IN (:years)')->setParameter('years', $years);
        }

        $summary = [];
        foreach ($qb->getQuery()->getArrayResult() as $row) {
            $count = (int) $row['ratingCount'];
            $summary[(int) $row['categoryId']] = [
                'average' => $count >= self::MIN_RATINGS_FOR_AN_AVERAGE ? round((float) $row['average'], 2) : null,
                'count' => $count,
            ];
        }

        return $summary;
    }

    /**
     * Average and count per academic year for one course and one section, newest year first.
     *
     * Drives the trend strip. A single number cannot say whether a course is getting better,
     * and it cannot explain why the recent and all-time scores differ; this can.
     *
     * @return array<int, array{year: string, average: float, count: int}>
     */
    public function summaryByYear(Course $course, CommentCategory $category): array
    {
        $rows = $this->createQueryBuilder('r')
            ->select('r.academicYear AS year, AVG(r.value) AS average, COUNT(r.id) AS ratingCount')
            ->andWhere('r.course = :course')
            ->andWhere('r.category = :category')
            ->setParameter('course', $course)
            ->setParameter('category', $category)
            ->groupBy('r.academicYear')
            ->orderBy('r.academicYear', 'DESC')
            ->getQuery()
            ->getArrayResult();

        return array_map(
            static fn(array $row): array => [
                'year' => (string) $row['year'],
                'average' => round((float) $row['average'], 2),
                'count' => (int) $row['ratingCount'],
            ],
            $rows
        );
    }
}
