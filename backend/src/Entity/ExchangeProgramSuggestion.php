<?php

namespace App\Entity;

use App\Constants\ExchangeProgram;
use Doctrine\ORM\Mapping as ORM;

/**
 * A student's suggestion that a destination is open to a programme (add) or no longer is
 * (remove). The lists come from the faculty and the old wiki and go out of date; a moderator
 * checks each suggestion and, by accepting it, changes the destination's programmes.
 */
#[ORM\Entity]
#[ORM\Index(name: 'exchange_program_suggestion_status_idx', columns: ['status'])]
class ExchangeProgramSuggestion extends BaseEntity
{
    public const ACTION_ADD = 'add';
    public const ACTION_REMOVE = 'remove';

    public const STATUS_PENDING = 'pending';
    public const STATUS_ACCEPTED = 'accepted';
    public const STATUS_REJECTED = 'rejected';

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ExchangeDestination $destination;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?User $author;

    /** An ExchangeProgram code. */
    #[ORM\Column(length: 8)]
    private string $program;

    #[ORM\Column(length: 8)]
    private string $action;

    /** Why, in the student's words: "dit jaar niet meer in de lijst van de faculteit". */
    #[ORM\Column(length: 500, nullable: true)]
    private ?string $note = null;

    #[ORM\Column(length: 16, options: ['default' => self::STATUS_PENDING])]
    private string $status = self::STATUS_PENDING;

    public function __construct(ExchangeDestination $destination, ?User $author, string $program, string $action)
    {
        $this->destination = $destination;
        $this->author = $author;
        $this->program = $program;
        $this->action = $action;
    }

    public function getDestination(): ExchangeDestination
    {
        return $this->destination;
    }

    public function getAuthor(): ?User
    {
        return $this->author;
    }

    public function getProgram(): string
    {
        return $this->program;
    }

    public function getAction(): string
    {
        return $this->action;
    }

    public function getNote(): ?string
    {
        return $this->note;
    }

    public function setNote(?string $note): static
    {
        $note = null === $note ? null : trim($note);
        $this->note = '' === $note ? null : $note;

        return $this;
    }

    public function getStatus(): string
    {
        return $this->status;
    }

    public function isPending(): bool
    {
        return self::STATUS_PENDING === $this->status;
    }

    /** Applies the suggestion to the destination's programmes. */
    public function accept(): void
    {
        $programs = $this->destination->getPrograms();
        if ($this->destination->isAllPrograms() && self::ACTION_REMOVE === $this->action) {
            // "Every programme but this one": list the others from now on.
            $programs = array_map(static fn (ExchangeProgram $program): string => $program->value, ExchangeProgram::cases());
            $this->destination->setAllPrograms(false);
        }
        if (self::ACTION_ADD === $this->action) {
            $programs[] = $this->program;
        } else {
            $programs = array_values(array_filter($programs, fn (string $program): bool => $program !== $this->program));
        }
        $this->destination->setPrograms($programs);
        $this->status = self::STATUS_ACCEPTED;
    }

    public function reject(): void
    {
        $this->status = self::STATUS_REJECTED;
    }

    public function __toString(): string
    {
        return sprintf('%s %s at %s', $this->action, $this->program, $this->destination->getName());
    }
}
