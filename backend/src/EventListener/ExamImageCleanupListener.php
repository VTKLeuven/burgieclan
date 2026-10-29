<?php

namespace App\EventListener;

use App\Entity\Course;
use App\Entity\Exam;
use App\Repository\ExamImageRepository;
use App\Repository\ExamRepository;
use App\Service\Exam\ExamImageStore;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsDoctrineListener;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Event\PostFlushEventArgs;
use Doctrine\ORM\Event\PreRemoveEventArgs;
use Doctrine\ORM\Events;

/**
 * Deleting an exam, or the course it belongs to, also deletes its image files. The rows go with
 * it through the foreign keys, so the database never tells anyone; the files are not in the
 * database at all.
 *
 * An exam that others were copied from keeps its images alive instead: its copies show them
 * without owning them (ExamImageRepository::examChain), so its oldest copy takes them over, and
 * its place in the chain, before it goes. The other copies then start from that oldest one.
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
        private readonly ExamRepository $exams,
        private readonly ExamImageStore $store,
    ) {}

    public function preRemove(PreRemoveEventArgs $args): void
    {
        $entity = $args->getObject();
        $fileNames = match (true) {
            $entity instanceof Exam => $this->handOverToCopy($entity, $args->getObjectManager())
                ? []
                : $this->images->fileNamesForExam($entity),
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

    /**
     * Gives the exam's images to its oldest copy that stays, if it has one. Runs before the
     * delete is flushed, so the move and the delete are stored together.
     */
    private function handOverToCopy(Exam $exam, EntityManagerInterface $entityManager): bool
    {
        $unitOfWork = $entityManager->getUnitOfWork();
        $copies = array_values(
            array_filter(
                $this->exams->findCopiesOf($exam),
                static fn(Exam $copy): bool => !$unitOfWork->isScheduledForDelete($copy),
            )
        );
        if ([] === $copies) {
            return false;
        }

        $heir = array_shift($copies);
        $heir->setCopiedFrom($exam->getCopiedFrom());
        foreach ($copies as $copy) {
            $copy->setCopiedFrom($heir);
        }
        foreach ($this->images->findBy(['exam' => $exam]) as $image) {
            $image->setExam($heir);
        }

        return true;
    }
}
