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
    public function __construct(ManagerRegistry $registry)
    {
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
                ->setParameter('under_review', false)
                ->getQuery()
                ->getSingleScalarResult() ?? 0;
        } catch (NoResultException | NonUniqueResultException $e) {
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
                ->orWhere('d.name LIKE :t_' . $key)
                ->orWhere('d.file_name LIKE :t_' . $key)
                ->setParameter('t_' . $key, '%' . $term . '%')
            ;
        }

        /** @var Document[] $result */
        $result = $queryBuilder
            ->orderBy('d.updateDate', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult()
        ;

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
        return array_filter($terms, static function ($term) {
            return 2 <= $term->length();
        });
    }
}
