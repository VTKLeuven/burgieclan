<?php

namespace App\EventListener;

use App\Entity\Course;
use App\Entity\Exam;
use App\Repository\ExamImageRepository;
use App\Service\Exam\ExamImageStore;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsDoctrineListener;
use Doctrine\ORM\Event\PostFlushEventArgs;
use Doctrine\ORM\Event\PreRemoveEventArgs;
use Doctrine\ORM\Events;

/**
 * Deleting an exam, or the course it belongs to, also deletes its image files. The rows go with
 * it through the foreign keys, so the database never tells anyone; the files are not in the
 * database at all.
 *
 * The names are collected before the delete and the files removed only once the flush has gone
 * through: a failed delete keeps its images. A course removed straight in the database, outside
 * Doctrine, leaves its files behind.
 */
#[AsDoctrineListener(event: Events::preRemove)]
#[AsDoctrineListener(event: Events::postFlush)]
class ExamImageCleanupListener
{
    /** @var array<string, true> */
    private array $pending = [];

    public function __construct(
        private readonly ExamImageRepository $images,
        private readonly ExamImageStore $store,
    ) {}

    public function preRemove(PreRemoveEventArgs $args): void
    {
        $entity = $args->getObject();
        $fileNames = match (true) {
            $entity instanceof Exam => $this->images->fileNamesForExam($entity),
            $entity instanceof Course => $this->images->fileNamesForCourse($entity),
            default => [],
        };

        foreach ($fileNames as $fileName) {
            $this->pending[$fileName] = true;
        }
    }

    public function postFlush(PostFlushEventArgs $args): void
    {
        $fileNames = array_keys($this->pending);
        $this->pending = [];

        foreach ($fileNames as $fileName) {
            $this->store->deleteFile($fileName);
        }
    }
}
