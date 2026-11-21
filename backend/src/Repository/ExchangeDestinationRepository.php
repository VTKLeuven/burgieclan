<?php

namespace App\Repository;

use App\Entity\ExchangeDestination;
use App\Entity\ExchangeProgramSuggestion;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ExchangeDestination>
 *
 * @method ExchangeDestination|null find($id, $lockMode = null, $lockVersion = null)
 * @method ExchangeDestination|null findOneBy(array $criteria, array $orderBy = null)
 * @method ExchangeDestination[]    findAll()
 * @method ExchangeDestination[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class ExchangeDestinationRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ExchangeDestination::class);
    }

    /**
     * The approved destinations, plus the ones this user suggested that still wait for a moderator.
     *
     * @return list<ExchangeDestination>
     */
    public function findVisibleTo(User $user): array
    {
        /** @var list<ExchangeDestination> */
        return $this->createQueryBuilder('d')
            ->andWhere('d.approved = true OR d.suggestedBy = :user')
            ->setParameter('user', $user)
            ->orderBy('d.name', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /** Case-insensitive, so a student cannot add "eth zürich" next to "ETH Zürich". */
    public function findOneByNameInsensitive(string $name): ?ExchangeDestination
    {
        /** @var ExchangeDestination|null */
        return $this->createQueryBuilder('d')
            ->andWhere('LOWER(d.name) = LOWER(:name)')
            ->setParameter('name', trim($name))
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }

    public function countUnapproved(): int
    {
        return $this->count(['approved' => false]);
    }

    public function countPendingSuggestions(): int
    {
        return $this->getEntityManager()->getRepository(ExchangeProgramSuggestion::class)->count(['status' => ExchangeProgramSuggestion::STATUS_PENDING]);
    }
}
