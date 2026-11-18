<?php

namespace App\Entity;

use App\Repository\StudyPlannerRepository;
use DateTimeImmutable;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * Someone's study planner: their KU Leuven timetable subscription (a TimeEdit ICS link), kept as
 * a permanent history of sessions, plus what they did with it (ticked off, hidden, marked as
 * mandatory, weekly rules, deadlines entered by hand). One per user.
 *
 * The timetable feed is a rolling window: sessions that have taken place drop out of it after a
 * while. Every sync therefore merges the feed into the stored sessions and never deletes one; see
 * StudyPlannerSync.
 *
 * $feedToken is the secret in the link of the exported calendar, which calendar apps fetch
 * without logging in (StudyPlannerFeedController). Rotating it breaks the old link.
 */
#[ORM\Entity(repositoryClass: StudyPlannerRepository::class)]
class StudyPlanner extends BaseEntity
{
    #[ORM\OneToOne]
    #[ORM\JoinColumn(nullable: false, unique: true, onDelete: 'CASCADE')]
    private User $user;

    /** The TimeEdit subscription link, always https (see TimetableUrl). */
    #[ORM\Column(type: Types::STRING, length: 1000)]
    private string $icsUrl;

    #[ORM\Column(type: Types::STRING, length: 64, unique: true)]
    private string $feedToken;

    #[ORM\Column(type: Types::DATETIMETZ_IMMUTABLE, nullable: true)]
    private ?DateTimeImmutable $lastSync = null;

    /** When the last sync attempt was, successful or not (to back off from a failing feed). */
    #[ORM\Column(type: Types::DATETIMETZ_IMMUTABLE, nullable: true)]
    private ?DateTimeImmutable $lastAttempt = null;

    /** Why the last sync attempt failed; null after a successful one. */
    #[ORM\Column(type: Types::STRING, length: 255, nullable: true)]
    private ?string $syncError = null;

    /**
     * @var Collection<int, StudyPlannerEvent>
     */
    #[ORM\OneToMany(mappedBy: 'planner', targetEntity: StudyPlannerEvent::class, cascade: ['persist', 'remove'], orphanRemoval: true)]
    private Collection $events;

    /**
     * @var Collection<int, StudyPlannerRule>
     */
    #[ORM\OneToMany(mappedBy: 'planner', targetEntity: StudyPlannerRule::class, cascade: ['persist', 'remove'], orphanRemoval: true)]
    private Collection $rules;

    /**
     * @var Collection<int, StudyPlannerItem>
     */
    #[ORM\OneToMany(mappedBy: 'planner', targetEntity: StudyPlannerItem::class, cascade: ['persist', 'remove'], orphanRemoval: true)]
    private Collection $items;

    public function __construct(User $user, string $icsUrl)
    {
        $this->user = $user;
        $this->icsUrl = $icsUrl;
        $this->feedToken = self::newToken();
        $this->events = new ArrayCollection();
        $this->rules = new ArrayCollection();
        $this->items = new ArrayCollection();
    }

    public static function newToken(): string
    {
        return bin2hex(random_bytes(24));
    }

    public function getUser(): User
    {
        return $this->user;
    }

    public function getIcsUrl(): string
    {
        return $this->icsUrl;
    }

    public function setIcsUrl(string $icsUrl): self
    {
        $this->icsUrl = $icsUrl;

        return $this;
    }

    public function getFeedToken(): string
    {
        return $this->feedToken;
    }

    public function rotateFeedToken(): self
    {
        $this->feedToken = self::newToken();

        return $this;
    }

    public function getLastSync(): ?DateTimeImmutable
    {
        return $this->lastSync;
    }

    public function getLastAttempt(): ?DateTimeImmutable
    {
        return $this->lastAttempt;
    }

    public function getSyncError(): ?string
    {
        return $this->syncError;
    }

    public function markSynced(DateTimeImmutable $at): self
    {
        $this->lastSync = $at;
        $this->lastAttempt = $at;
        $this->syncError = null;

        return $this;
    }

    public function markSyncFailed(DateTimeImmutable $at, string $error): self
    {
        $this->lastAttempt = $at;
        $this->syncError = mb_substr($error, 0, 255);

        return $this;
    }

    /**
     * Forgets the stored sessions, for a new subscription link that may be someone else's
     * timetable. Rules and deadlines stay.
     */
    public function resetTimetable(): self
    {
        $this->events->clear();
        $this->lastSync = null;
        $this->lastAttempt = null;
        $this->syncError = null;

        return $this;
    }

    /**
     * @return Collection<int, StudyPlannerEvent>
     */
    public function getEvents(): Collection
    {
        return $this->events;
    }

    public function addEvent(StudyPlannerEvent $event): self
    {
        $this->events->add($event);

        return $this;
    }

    public function findEvent(string $uid): ?StudyPlannerEvent
    {
        foreach ($this->events as $event) {
            if ($event->getUid() === $uid) {
                return $event;
            }
        }

        return null;
    }

    /**
     * @return Collection<int, StudyPlannerRule>
     */
    public function getRules(): Collection
    {
        return $this->rules;
    }

    public function addRule(StudyPlannerRule $rule): self
    {
        $this->rules->add($rule);

        return $this;
    }

    public function removeRule(StudyPlannerRule $rule): self
    {
        $this->rules->removeElement($rule);

        return $this;
    }

    /**
     * @return Collection<int, StudyPlannerItem>
     */
    public function getItems(): Collection
    {
        return $this->items;
    }

    public function addItem(StudyPlannerItem $item): self
    {
        $this->items->add($item);

        return $this;
    }

    public function removeItem(StudyPlannerItem $item): self
    {
        $this->items->removeElement($item);

        return $this;
    }
}
