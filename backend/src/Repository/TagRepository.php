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

use App\Entity\Tag;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Tag>
 *
 * @method Tag|null find($id, $lockMode = null, $lockVersion = null)
 * @method Tag|null findOneBy(array $criteria, array $orderBy = null)
 * @method Tag[]    findAll()
 * @method Tag[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class TagRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Tag::class);
    }

    /**
     * Find tags that either have no documents or have documents matching the given course/category.
     *
     * @param int|null $courseId Optional course ID to filter by
     * @param int|null $categoryId Optional category ID to filter by
     * @return Tag[] Returns an array of Tag objects
     */
    public function findByCourseOrCategoryOrUnused(?int $courseId = null, ?int $categoryId = null): array
    {
        $queryBuilder = $this->createQueryBuilder('tag')
            ->leftJoin('tag.documents', 'document');

        $expr = $queryBuilder->expr();
        
        // Start with tags that have no documents
        $orConditions = $expr->orX();
        $orConditions->add($expr->isNull('document.id'));

        // If filters are provided, add condition for tags with matching documents
        if ($courseId || $categoryId) {
            $andConditions = $expr->andX();
            
            if ($courseId) {
                $queryBuilder
                    ->leftJoin('document.course', 'course')
                    ->setParameter('courseId', $courseId);
                $andConditions->add($expr->eq('course.id', ':courseId'));
            }

            if ($categoryId) {
                $queryBuilder
                    ->leftJoin('document.category', 'category')
                    ->setParameter('categoryId', $categoryId);
                $andConditions->add($expr->eq('category.id', ':categoryId'));
            }

            $orConditions->add($andConditions);
        }

        return $queryBuilder
            ->where($orConditions)
            ->orderBy('tag.name', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
