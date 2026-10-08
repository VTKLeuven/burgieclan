<?php

namespace App\Repository;

use App\Entity\Course;
use App\Entity\Exam;
use App\Entity\ExamImage;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ExamImage>
 */
class ExamImageRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ExamImage::class);
    }

    public function findOneByUuid(string $uuid): ?ExamImage
    {
        // Postgres would reject a malformed value for the uuid column outright.
        if (1 !== preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/', $uuid)) {
            return null;
        }

        return $this->findOneBy(['uuid' => $uuid]);
    }

    public function countForExam(Exam $exam): int
    {
        return $this->count(['exam' => $exam]);
    }

    /**
     * Newest first, removed ones included.
     *
     * @return ExamImage[]
     */
    public function findForExam(Exam $exam): array
    {
        return $this->findBy(['exam' => $exam], ['createdAt' => 'DESC', 'id' => 'DESC']);
    }

    /**
     * @return list<string>
     */
    public function fileNamesForExam(Exam $exam): array
    {
        return $this->createQueryBuilder('i')
            ->select('i.fileName')
            ->where('i.exam = :exam')
            ->setParameter('exam', $exam)
            ->getQuery()
            ->getSingleColumnResult();
    }

    /**
     * The files of every exam of a course.
     *
     * @return list<string>
     */
    public function fileNamesForCourse(Course $course): array
    {
        return $this->createQueryBuilder('i')
            ->select('i.fileName')
            ->join('i.exam', 'e')
            ->where('e.course = :course')
            ->setParameter('course', $course)
            ->getQuery()
            ->getSingleColumnResult();
    }
}
