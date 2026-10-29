<?php

namespace App\Repository;

use App\Constants\ExamPeriod;
use App\Entity\Course;
use App\Entity\Exam;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Exam>
 *
 * @method Exam|null find($id, $lockMode = null, $lockVersion = null)
 * @method Exam|null findOneBy(array $criteria, array $orderBy = null)
 * @method Exam[]    findAll()
 * @method Exam[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class ExamRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Exam::class);
    }

    public function findOneFor(Course $course, string $academicYear, ExamPeriod $period): ?Exam
    {
        return $this->findOneBy(['course' => $course, 'academicYear' => $academicYear, 'period' => $period]);
    }

    public function findByDocumentName(string $name): ?Exam
    {
        $id = Exam::idFromDocumentName($name);

        return null === $id ? null : $this->find($id);
    }

    /**
     * The reconstructions that started as a copy of this one, oldest first.
     *
     * @return Exam[]
     */
    public function findCopiesOf(Exam $exam): array
    {
        return $this->findBy(['copiedFrom' => $exam], ['id' => 'ASC']);
    }
}
