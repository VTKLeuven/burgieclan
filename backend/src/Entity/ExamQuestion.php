<?php

namespace App\Entity;

use App\Repository\ExamQuestionRepository;
use DateTimeImmutable;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * One question of an exam reconstruction, as a row.
 *
 * The questions are edited in the live document, which stays the source of truth; this is a copy
 * of them that ExamQuestionSync keeps in step every time the document is stored. It exists so
 * questions can be searched, and so comments and "Ik had deze ook" have something to point at.
 *
 * A question is identified by `uid`, the permanent id the editor gives every examQuestion node
 * (UniqueID in the frontend). It is unique per exam, not globally: a reconstruction started as a
 * copy of another keeps that exam's uids.
 *
 * A question that disappears from the document is marked removed, never deleted: a rollback can
 * bring it back, together with everything attached to it.
 */
#[ORM\Entity(repositoryClass: ExamQuestionRepository::class)]
#[ORM\UniqueConstraint(name: 'uniq_exam_question_exam_uid', columns: ['exam_id', 'uid'])]
class ExamQuestion extends BaseEntity
{
    /** UniqueID makes UUIDs; anything longer is not one of ours. */
    public const MAX_UID_LENGTH = 64;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Exam $exam;

    #[ORM\Column(length: self::MAX_UID_LENGTH)]
    private string $uid;

    /** Where it stands among the questions of the document, from 0. A removed one keeps its last. */
    #[ORM\Column]
    private int $position = 0;

    /** The question as plain text, math as its LaTeX source between dollar signs. */
    #[ORM\Column(type: Types::TEXT)]
    private string $text = '';

    /**
     * Ids of the days it came up on, from the document's "sittings" field.
     *
     * @var list<string>
     */
    #[ORM\Column(type: Types::JSON)]
    private array $sittings = [];

    /**
     * When it disappeared from the document; null while it is there. A row made on demand before
     * the collab server stored the question also starts out removed (ExamQuestionRepository::
     * findOrCreate), until a store shows the question is real.
     */
    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?DateTimeImmutable $removedAt = null;

    public function __construct(Exam $exam, string $uid)
    {
        $this->exam = $exam;
        $this->uid = $uid;
    }

    public function getExam(): Exam
    {
        return $this->exam;
    }

    public function getUid(): string
    {
        return $this->uid;
    }

    public function getPosition(): int
    {
        return $this->position;
    }

    public function setPosition(int $position): static
    {
        $this->position = $position;

        return $this;
    }

    public function getText(): string
    {
        return $this->text;
    }

    public function setText(string $text): static
    {
        $this->text = $text;

        return $this;
    }

    /**
     * @return list<string>
     */
    public function getSittings(): array
    {
        return $this->sittings;
    }

    /**
     * @param list<string> $sittings
     */
    public function setSittings(array $sittings): static
    {
        $this->sittings = $sittings;

        return $this;
    }

    public function isRemoved(): bool
    {
        return null !== $this->removedAt;
    }

    public function getRemovedAt(): ?DateTimeImmutable
    {
        return $this->removedAt;
    }

    public function setRemovedAt(?DateTimeImmutable $removedAt): static
    {
        $this->removedAt = $removedAt;

        return $this;
    }
}
