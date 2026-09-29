<?php

namespace App\Entity;

use App\Repository\CollabDocumentRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * The stored state of one live, collaboratively edited document.
 *
 * The collab server (Hocuspocus, see `collab/`) holds a document in memory while people are
 * editing it and writes it back here a moment after edits stop. Nothing else writes to this
 * table: the frontend never talks to it directly, and Symfony only stores what the collab server
 * sends through the internal routes in CollabDocumentController.
 *
 * A document is identified by its name, e.g. "exam-12". Whatever feature owns the document
 * (exam reconstructions, from phase 1 on) refers to it by that name, which keeps this table
 * generic.
 */
#[ORM\Entity(repositoryClass: CollabDocumentRepository::class)]
#[ORM\UniqueConstraint(name: 'uniq_collab_document_name', columns: ['name'])]
class CollabDocument extends BaseEntity
{
    /**
     * Lowercase letters, digits and hyphens, starting with a letter or digit. Kept strict because
     * the name travels through a URL path and a signed token.
     */
    public const NAME_PATTERN = '/^[a-z0-9][a-z0-9-]{0,99}$/';

    #[ORM\Column(length: 100)]
    private string $name;

    /**
     * The document as a Yjs update (`Y.encodeStateAsUpdate`). This is the source of truth.
     *
     * Never rebuild it from `content`: clients that are still connected would merge their own copy
     * back in and the text would duplicate. Changing a live document goes through the collab
     * server, so the change reaches every client as a normal edit.
     *
     * @var resource|string
     */
    #[ORM\Column(type: Types::BLOB)]
    private $state;

    /**
     * The same content as TipTap JSON, derived by the collab server on every store. Read-only
     * copy for rendering and search; see the warning on `state`.
     *
     * @var array<string, mixed>|null
     */
    #[ORM\Column(type: Types::JSON, nullable: true)]
    private ?array $content = null;

    public function __construct(string $name, string $state)
    {
        $this->name = $name;
        $this->state = $state;
    }

    public static function isValidName(string $name): bool
    {
        return 1 === preg_match(self::NAME_PATTERN, $name);
    }

    public function getName(): string
    {
        return $this->name;
    }

    /**
     * Doctrine hands BLOB columns back as a stream, which can only be read once. Reading it into a
     * string here makes repeated calls safe.
     */
    public function getState(): string
    {
        if (is_resource($this->state)) {
            rewind($this->state);
            $this->state = (string) stream_get_contents($this->state);
        }

        return $this->state;
    }

    public function setState(string $state): static
    {
        $this->state = $state;

        return $this;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function getContent(): ?array
    {
        return $this->content;
    }

    /**
     * @param array<string, mixed>|null $content
     */
    public function setContent(?array $content): static
    {
        $this->content = $content;

        return $this;
    }

    public function __toString(): string
    {
        return $this->name;
    }
}
