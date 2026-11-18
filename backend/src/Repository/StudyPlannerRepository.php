<?php

namespace App\Repository;

use App\Entity\StudyPlanner;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<StudyPlanner>
 */
class StudyPlannerRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, StudyPlanner::class);
    }

    public function findForUser(User $user): ?StudyPlanner
    {
        return $this->findOneBy(['user' => $user]);
    }

    public function findByFeedToken(string $token): ?StudyPlanner
    {
        return $this->findOneBy(['feedToken' => $token]);
    }
}
