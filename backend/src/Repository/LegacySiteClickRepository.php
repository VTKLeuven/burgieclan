<?php

namespace App\Repository;

use App\Entity\LegacySiteClick;
use App\Entity\User;
use DateTimeImmutable;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<LegacySiteClick>
 *
 * @method LegacySiteClick|null find($id, $lockMode = null, $lockVersion = null)
 * @method LegacySiteClick|null findOneBy(array $criteria, array $orderBy = null)
 * @method LegacySiteClick[] findAll()
 * @method LegacySiteClick[] findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class LegacySiteClickRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, LegacySiteClick::class);
    }

    public function recordClick(User $user, DateTimeImmutable $clickedAt): void
    {
        // One atomic upsert keeps rapid/double clicks from racing into the unique user index.
        $this->getEntityManager()->getConnection()->executeStatement(
            <<<'SQL'
                INSERT INTO legacy_site_click (
                    user_id,
                    click_count,
                    last_clicked_at,
                    created_at,
                    updated_at
                ) VALUES (:userId, 1, :clickedAt, :clickedAt, :clickedAt)
                ON CONFLICT (user_id) DO UPDATE SET
                    click_count = legacy_site_click.click_count + 1,
                    last_clicked_at = EXCLUDED.last_clicked_at,
                    updated_at = EXCLUDED.updated_at
                SQL,
            [
                'userId' => $user->getId(),
                'clickedAt' => $clickedAt,
            ],
            [
                'userId' => Types::INTEGER,
                'clickedAt' => Types::DATETIME_IMMUTABLE,
            ]
        );
    }
}
