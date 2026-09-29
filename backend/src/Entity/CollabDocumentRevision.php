<?php

namespace App\Entity;

use App\Repository\CollabDocumentRevisionRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * An earlier version of a live document, kept so moderators can see who changed what and roll
 * back vandalism or mistakes.
 *
 * Revisions are taken by CollabDocumentStore while documents are stored: at most one per
 * CollabDocumentStore::SNAPSHOT_INTERVAL of editing, plus one right before a rollback, so a
 * rollback can itself be undone. Each holds the document as it was at that moment and the users
 * who changed it since the revision before.
 *
 * Restoring one never writes its state back into CollabDocument: it goes through the collab
 * server (CollabServerClient::restore), which applies it to the live document as a normal edit.
 */
#[ORM\Entity(repositoryClass: CollabDocumentRevisionRepository::class)]
#[ORM\Index(name: 'idx_collab_document_revision_document_created', columns: ['document_id', 'created_at'])]
class CollabDocumentRevision extends BaseEntity
{
    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private CollabDocument $document;

    /**
     * The document as a Yjs update, like CollabDocument::$state.
     *
     * @var resource|string
     */
    #[ORM\Column(type: Types::BLOB)]
    private $state;

    /**
     * @var array<string, mixed>|null
     */
    #[ORM\Column(type: Types::JSON, nullable: true)]
    private ?array $content;

    /**
     * @var array<string, mixed>|null
     */
    #[ORM\Column(type: Types::JSON, nullable: true)]
    private ?array $fields;

    /**
     * Ids of the users who changed the document between the previous revision and this one.
     *
     * @var list<int>
     */
    #[ORM\Column(type: Types::JSON)]
    private array $contributors;

    /** Why this revision was taken, when it was not a regular snapshot, e.g. before a rollback. */
    #[ORM\Column(length: 255, nullable: true)]
    private ?string $note = null;

    /**
     * @param list<int> $contributors
     */
    public function __construct(CollabDocument $document, array $contributors, ?string $note = null)
    {
        $this->document = $document;
        $this->state = $document->getState();
        $this->content = $document->getContent();
        $this->fields = $document->getFields();
        $this->contributors = $contributors;
        $this->note = $note;
    }

    public function getDocument(): CollabDocument
    {
        return $this->document;
    }

    /**
     * @see CollabDocument::getState()
     */
    public function getState(): string
    {
        if (is_resource($this->state)) {
            rewind($this->state);
            $this->state = (string) stream_get_contents($this->state);
        }

        return $this->state;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function getContent(): ?array
    {
        return $this->content;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function getFields(): ?array
    {
        return $this->fields;
    }

    /**
     * @return list<int>
     */
    public function getContributors(): array
    {
        return $this->contributors;
    }

    public function getNote(): ?string
    {
        return $this->note;
    }
}
