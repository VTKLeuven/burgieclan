<?php

namespace App\Repository;

use App\Constants\NotificationType;
use App\Entity\Notification;
use App\Entity\User;
use DateTimeImmutable;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\ORM\QueryBuilder;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Notification>
 *
 * @method Notification|null find($id, $lockMode = null, $lockVersion = null)
 * @method Notification|null findOneBy(array $criteria, array $orderBy = null)
 * @method Notification[]    findAll()
 * @method Notification[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class NotificationRepository extends ServiceEntityRepository
{
    /** Older notifications are dropped the next time their owner opens the list. */
    public const KEEP_FOR = '90 days';

    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Notification::class);
    }

    /**
     * The newest notifications of a user, with what they point to, minus what the user may not
     * see right now: a document that went back into review, and anything about exams while that
     * feature is switched off.
     *
     * @return Notification[]
     */
    public function findLatestFor(User $user, bool $includeExams, int $limit): array
    {
        return $this->visibleTo($user, $includeExams)
            ->addSelect('c', 'd', 'e', 'cc')
            ->leftJoin('n.exam', 'e')
            ->leftJoin('n.courseComment', 'cc')
            ->orderBy('n.updatedAt', 'DESC')
            ->addOrderBy('n.id', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }

    public function countUnreadFor(User $user, bool $includeExams): int
    {
        return (int) $this->visibleTo($user, $includeExams)
            ->select('COUNT(n.id)')
            ->andWhere('n.readAt IS NULL')
            ->getQuery()
            ->getSingleScalarResult();
    }

    public function markAllReadFor(User $user, ?DateTimeImmutable $now = null): void
    {
        $this->createQueryBuilder('n')
            ->update()
            ->set('n.readAt', ':now')
            ->where('n.user = :user')
            ->andWhere('n.readAt IS NULL')
            ->setParameter('now', $now ?? new DateTimeImmutable())
            ->setParameter('user', $user)
            ->getQuery()
            ->execute();
    }

    public function pruneFor(User $user, ?DateTimeImmutable $now = null): void
    {
        $this->createQueryBuilder('n')
            ->delete()
            ->where('n.user = :user')
            ->andWhere('n.updatedAt < :before')
            ->setParameter('user', $user)
            ->setParameter('before', ($now ?? new DateTimeImmutable())->modify('-' . self::KEEP_FOR))
            ->getQuery()
            ->execute();
    }

    private function visibleTo(User $user, bool $includeExams): QueryBuilder
    {
        $builder = $this->createQueryBuilder('n')
            ->join('n.course', 'c')
            ->leftJoin('n.document', 'd')
            ->where('n.user = :user')
            ->andWhere('n.document IS NULL OR d.under_review = false')
            ->setParameter('user', $user);

        if (!$includeExams) {
            $builder->andWhere('n.type NOT IN (:examTypes)')
                ->setParameter('examTypes', [NotificationType::EXAM->value, NotificationType::EXAM_QUESTIONS->value]);
        }

        return $builder;
    }
}
