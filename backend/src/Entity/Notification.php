<?php

namespace App\Entity;

use App\Constants\NotificationType;
use App\Repository\NotificationRepository;
use DateTimeImmutable;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * One line in a user's notifications: something new in a course they follow.
 *
 * Written by CourseNotifier straight through DBAL, one statement for all followers at once, so
 * nothing here runs on insert; createdAt and updatedAt are filled in by that statement. updatedAt
 * moves when a bundle of exam questions grows, which brings it back to the top.
 *
 * Never names who did it: comments and documents can be anonymous. The thing it points to is
 * deleted together with it.
 */
#[ORM\Entity(repositoryClass: NotificationRepository::class)]
#[ORM\Index(name: 'notification_user_updated_idx', columns: ['user_id', 'updated_at'])]
#[ORM\Index(name: 'notification_user_read_idx', columns: ['user_id', 'read_at'])]
class Notification extends BaseEntity
{
    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private User $user;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Course $course;

    #[ORM\Column(length: 32, enumType: NotificationType::class)]
    private NotificationType $type;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    private ?Document $document = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    private ?Exam $exam = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    private ?CourseComment $courseComment = null;

    /** How many things this one line stands for; only ever above 1 for exam questions. */
    #[ORM\Column(options: ['default' => 1])]
    private int $count = 1;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?DateTimeImmutable $readAt = null;

    public function __construct(User $user, Course $course, NotificationType $type)
    {
        $this->user = $user;
        $this->course = $course;
        $this->type = $type;
    }

    public function getUser(): User
    {
        return $this->user;
    }

    public function getCourse(): Course
    {
        return $this->course;
    }

    public function getType(): NotificationType
    {
        return $this->type;
    }

    public function getDocument(): ?Document
    {
        return $this->document;
    }

    public function setDocument(?Document $document): static
    {
        $this->document = $document;

        return $this;
    }

    public function getExam(): ?Exam
    {
        return $this->exam;
    }

    public function setExam(?Exam $exam): static
    {
        $this->exam = $exam;

        return $this;
    }

    public function getCourseComment(): ?CourseComment
    {
        return $this->courseComment;
    }

    public function setCourseComment(?CourseComment $courseComment): static
    {
        $this->courseComment = $courseComment;

        return $this;
    }

    public function getCount(): int
    {
        return $this->count;
    }

    public function setCount(int $count): static
    {
        $this->count = $count;

        return $this;
    }

    public function getReadAt(): ?DateTimeImmutable
    {
        return $this->readAt;
    }

    public function isRead(): bool
    {
        return null !== $this->readAt;
    }
}
