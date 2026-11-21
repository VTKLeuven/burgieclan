<?php

namespace App\EventListener;

use App\Entity\CourseComment;
use App\Entity\Document;
use App\Entity\Exam;
use App\Entity\User;
use App\Service\Notification\CourseNotifier;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsEntityListener;
use Doctrine\ORM\Event\PreUpdateEventArgs;
use Doctrine\ORM\Events;

/**
 * Notifies the followers of a course when a document, comment or exam reconstruction appears in it.
 *
 * A document counts once students can see it: when a moderator takes it out of review, or when it
 * is created without review in the first place (an upload in the admin). An upload waiting for
 * review notifies nobody yet.
 *
 * New questions in a reconstruction do not pass through here; CollabDocumentStore reports those,
 * since only it knows who wrote them.
 */
#[AsEntityListener(event: Events::postPersist, method: 'documentPersisted', entity: Document::class)]
#[AsEntityListener(event: Events::preUpdate, method: 'documentUpdating', entity: Document::class)]
#[AsEntityListener(event: Events::postUpdate, method: 'documentUpdated', entity: Document::class)]
#[AsEntityListener(event: Events::postPersist, method: 'courseCommentPersisted', entity: CourseComment::class)]
#[AsEntityListener(event: Events::postPersist, method: 'examPersisted', entity: Exam::class)]
class CourseNotificationListener
{
    /** @var array<int, true> spl_object_id of the documents leaving review in the running flush */
    private array $approved = [];

    public function __construct(
        private readonly CourseNotifier $notifier,
    ) {}

    public function documentPersisted(Document $document): void
    {
        if (!$document->isUnderReview()) {
            $this->notifier->documentAdded($document, self::ids($document->getCreator()));
        }
    }

    public function documentUpdating(Document $document, PreUpdateEventArgs $args): void
    {
        if (
            $args->hasChangedField('under_review')
            && true === $args->getOldValue('under_review')
            && false === $args->getNewValue('under_review')
        ) {
            $this->approved[spl_object_id($document)] = true;
        }
    }

    public function documentUpdated(Document $document): void
    {
        $key = spl_object_id($document);
        if (!isset($this->approved[$key])) {
            return;
        }
        unset($this->approved[$key]);

        $this->notifier->documentAdded($document, self::ids($document->getCreator()));
    }

    public function courseCommentPersisted(CourseComment $comment): void
    {
        $this->notifier->courseCommentAdded($comment, self::ids($comment->getCreator()));
    }

    public function examPersisted(Exam $exam): void
    {
        $this->notifier->examStarted($exam, self::ids($exam->getCreator()));
    }

    /** @return int[] */
    private static function ids(?User $user): array
    {
        $id = $user?->getId();

        return null === $id ? [] : [$id];
    }
}
