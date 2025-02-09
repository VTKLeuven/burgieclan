<?php

namespace App\Repository;

use App\Entity\Document;
use App\Entity\User;
use App\Entity\UserDocumentView;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<UserDocumentView>
 *
 * @method UserDocumentView|null find($id, $lockMode = null, $lockVersion = null)
 * @method UserDocumentView|null findOneBy(array $criteria, array $orderBy = null)
 * @method UserDocumentView[]    findAll()
 * @method UserDocumentView[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class UserDocumentViewRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, UserDocumentView::class);
    }

    public function findRecentDocumentsByUser(User $user, int $limit = 10): array
    {
        return $this->createQueryBuilder('v')
            ->select('v', 'd')
            ->join('v.document', 'd')
            ->where('v.user = :user')
            ->setParameter('user', $user)
            ->orderBy('v.lastViewed', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }

    public function recordView(
        User $user,
        Document $document,
        \DateTimeInterface $viewedAt,
        bool $flush = true
    ): UserDocumentView {
        $view = $this->findOneBy(['user' => $user, 'document' => $document]);

        if (!$view) {
            $view = new UserDocumentView($user, $document, $viewedAt);
            $this->getEntityManager()->persist($view);
        } else {
            $view->setLastViewedAt($viewedAt);
        }

        if ($flush) {
            $this->getEntityManager()->flush();
        }

        return $view;
    }

    public function clearOldViews(\DateTimeInterface $before): int
    {
        return $this->createQueryBuilder('v')
            ->delete()
            ->where('v.lastViewed < :before')
            ->setParameter('before', $before)
            ->getQuery()
            ->execute();
    }
}
