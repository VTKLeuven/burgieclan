<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use App\Repository\UserDocumentViewRepository;
use DateTimeInterface;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: UserDocumentViewRepository::class)]
#[ORM\Index(columns: ['last_viewed'])]
#[ORM\UniqueConstraint(columns: ['user_id', 'document_id'])]
#[ApiResource]
class UserDocumentView
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'documentViews')]
    #[ORM\JoinColumn(nullable: false)]
    private User $user;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    private Document $document;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private DateTimeInterface $lastViewed;

    public function __construct(User $user, Document $document, DateTimeInterface $lastViewed)
    {
        $this->user = $user;
        $this->document = $document;
        $this->lastViewed = $lastViewed;
    }

    public function getId(): int
    {
        return $this->id;
    }

    public function getUser(): User
    {
        return $this->user;
    }

    public function setUser(User $user): static
    {
        $this->user = $user;

        return $this;
    }

    public function getDocument(): Document
    {
        return $this->document;
    }

    public function setDocument(Document $document): static
    {
        $this->document = $document;

        return $this;
    }

    public function getLastViewedAt(): DateTimeInterface
    {
        return $this->lastViewed;
    }

    public function setLastViewedAt(DateTimeInterface $lastViewedAt): static
    {
        $this->lastViewed = $lastViewedAt;

        return $this;
    }
}
