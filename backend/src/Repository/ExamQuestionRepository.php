<?php

namespace App\Repository;

use App\Entity\Exam;
use App\Entity\ExamQuestion;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ExamQuestion>
 */
class ExamQuestionRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ExamQuestion::class);
    }

    /**
     * Every question the exam ever had, removed ones included, by uid.
     *
     * @return array<string, ExamQuestion>
     */
    public function findAllByUid(Exam $exam): array
    {
        $byUid = [];
        foreach ($this->findBy(['exam' => $exam]) as $question) {
            $byUid[$question->getUid()] = $question;
        }

        return $byUid;
    }

    /**
     * The questions as they are in the document now, in order.
     *
     * @return ExamQuestion[]
     */
    public function findCurrent(Exam $exam): array
    {
        return $this->createQueryBuilder('q')
            ->where('q.exam = :exam')
            ->andWhere('q.removedAt IS NULL')
            ->setParameter('exam', $exam)
            ->orderBy('q.position', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
