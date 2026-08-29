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

use App\Entity\Course;
use App\Entity\Document;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\ORM\NonUniqueResultException;
use Doctrine\ORM\NoResultException;
use Doctrine\Persistence\ManagerRegistry;
use Psr\Log\LoggerInterface;

use function Symfony\Component\String\u;

/**
 * @extends ServiceEntityRepository<Document>
 *
 * @method Document|null find($id, $lockMode = null, $lockVersion = null)
 * @method Document|null findOneBy(array $criteria, array $orderBy = null)
 * @method Document[]    findAll()
 * @method Document[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class DocumentRepository extends ServiceEntityRepository
{
    public function __construct(
        ManagerRegistry $registry,
        private readonly LoggerInterface $logger
    ) {
        parent::__construct($registry, Document::class);
    }

    /**
     * @return float|bool|int|string
     */
    public function getAmountPending(): float|bool|int|string
    {
        try {
            return $this->createQueryBuilder('d')
                ->select('count(d.id)')
                ->andWhere('d.under_review = :under_review')
                ->setParameter('under_review', true)
                ->getQuery()
                ->getSingleScalarResult() ?? 0;
        } catch (NoResultException | NonUniqueResultException $e) {
            $this->logger->warning(
                'Error counting pending documents',
                [
                    'error' => $e->getMessage()
                ]
            );
            return 0;
        }
    }

    /**
     * @param Course $course
     * @return Document[]
     */
    public function findByCourseAndHasFile(Course $course): array
    {
        return $this->createQueryBuilder('d')
            ->andWhere('d.course = :course')
            ->andWhere('d.file_name IS NOT NULL')
            ->setParameter('course', $course)
            ->getQuery()
            ->getResult();
    }

    /**
     * @return array<int, int> Map of categoryId => documentCount for a given course
     */
    public function countByCategoryForCourse(Course $course): array
    {
        $qb = $this->createQueryBuilder('d')
            ->select('IDENTITY(d.category) AS categoryId, COUNT(d.id) AS docCount')
            ->andWhere('d.course = :course')
            ->andWhere('d.under_review = :under_review')
            ->setParameter('course', $course)
            ->setParameter('under_review', false)
            ->groupBy('d.category');

        $results = $qb->getQuery()->getArrayResult();
        $counts = [];
        foreach ($results as $row) {
            $counts[(int) $row['categoryId']] = (int) $row['docCount'];
        }

        return $counts;
    }

    /**
     * Published document totals for a set of courses, as courseId => count.
     *
     * One query for the whole set: the related courses on a course page are counted together,
     * so linking to a predecessor archive costs the same whether there is one or five.
     *
     * @param Course[] $courses
     * @return array<int, int>
     */
    public function countPublishedForCourses(array $courses): array
    {
        if ([] === $courses) {
            return [];
        }

        $rows = $this->createQueryBuilder('d')
            ->select('IDENTITY(d.course) AS courseId, COUNT(d.id) AS docCount')
            ->andWhere('d.course IN (:courses)')
            ->andWhere('d.under_review = :under_review')
            ->setParameter('courses', $courses)
            ->setParameter('under_review', false)
            ->groupBy('d.course')
            ->getQuery()
            ->getArrayResult();

        $counts = [];
        foreach ($rows as $row) {
            $counts[(int) $row['courseId']] = (int) $row['docCount'];
        }

        return $counts;
    }


    /**
     * @return Document[]
     */
    public function findBySearchQuery(string $query, int $limit = 20): array
    {
        $searchTerms = $this->extractSearchTerms($query);

        if (0 === \count($searchTerms)) {
            return [];
        }

        $queryBuilder = $this->createQueryBuilder('d');

        foreach ($searchTerms as $key => $term) {
            $queryBuilder
                ->orWhere('LOWER(d.name) LIKE :t_' . $key)
                ->orWhere('LOWER(d.file_name) LIKE :t_' . $key)
                ->setParameter('t_' . $key, '%' . mb_strtolower((string) $term) . '%');
        }

        /** @var Document[] $result */
        $result = $queryBuilder
            ->orderBy('d.updatedAt', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();

        return $result;
    }

    /**
     * Transforms the search string into an array of search terms.
     *
     * @return string[]
     */
    private function extractSearchTerms(string $searchQuery): array
    {
        $searchQuery = u($searchQuery)->replaceMatches('/[[:space:]]+/', ' ')->trim();
        $terms = array_unique($searchQuery->split(' '));

        // ignore the search terms that are too short
        return array_filter(
            $terms,
            static function ($term) {
                return 2 <= $term->length();
            }
        );
    }
}
