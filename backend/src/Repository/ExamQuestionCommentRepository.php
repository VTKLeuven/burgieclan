<?php

namespace App\Repository;

use App\Entity\Exam;
use App\Entity\ExamQuestionComment;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ExamQuestionComment>
 */
class ExamQuestionCommentRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ExamQuestionComment::class);
    }

    /**
     * Every comment on the exam, by question in document order, with their questions and authors
     * loaded in the same query.
     *
     * @return ExamQuestionComment[]
     */
    public function findForExam(Exam $exam): array
    {
        return $this->createQueryBuilder('c')
            ->addSelect('q', 'u')
            ->join('c.question', 'q')
            ->join('c.creator', 'u')
            ->where('q.exam = :exam')
            ->setParameter('exam', $exam)
            ->orderBy('q.position', 'ASC')
            ->addOrderBy('q.id', 'ASC')
            ->addOrderBy('c.createdAt', 'ASC')
            ->addOrderBy('c.id', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
