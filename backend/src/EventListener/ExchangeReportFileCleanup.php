<?php

namespace App\EventListener;

use App\Entity\ExchangeDestination;
use App\Entity\ExchangeReportFile;
use App\Service\Exchange\ExchangeReportFileStore;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsDoctrineListener;
use Doctrine\ORM\Event\PreRemoveEventArgs;
use Doctrine\ORM\Events;

/**
 * Deletes the stored files of exchange report attachments once their rows are gone: a report
 * deleted on the site or in the admin (its files go with it through the ORM cascade), and a
 * destination deleted in the admin, whose reports the database cascades without the ORM seeing them.
 *
 * The names are collected before the flush and deleted after it, so a flush that fails leaves the
 * files in place.
 */
#[AsDoctrineListener(event: Events::preRemove)]
#[AsDoctrineListener(event: Events::postFlush)]
class ExchangeReportFileCleanup
{
    /** @var list<string> */
    private array $pending = [];

    public function __construct(
        private readonly ExchangeReportFileStore $store,
    ) {}

    public function preRemove(PreRemoveEventArgs $args): void
    {
        $entity = $args->getObject();
        if ($entity instanceof ExchangeReportFile) {
            $this->pending[] = $entity->getFileName();
        } elseif ($entity instanceof ExchangeDestination && null !== $entity->getId()) {
            $names = $args->getObjectManager()->createQuery(
                'SELECT f.fileName FROM ' . ExchangeReportFile::class . ' f JOIN f.report r WHERE r.destination = :destination'
            )->setParameter('destination', $entity)->getSingleColumnResult();
            array_push($this->pending, ...$names);
        }
    }

    public function postFlush(): void
    {
        $names = array_unique($this->pending);
        $this->pending = [];
        foreach ($names as $name) {
            $this->store->deleteFile($name);
        }
    }
}
