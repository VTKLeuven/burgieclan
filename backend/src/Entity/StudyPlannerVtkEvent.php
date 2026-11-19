<?php

namespace App\Entity;

use DateTimeImmutable;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * A VTK event someone put in their study planner, so their lessons and VTK's activities sit in
 * one calendar (the planner, the VTK app and the exported calendar).
 *
 * The choice lives here, with the rest of the planner; what the event is (title, time, place)
 * belongs to the VTK website. This row keeps a copy of that, refreshed from VTK every hour
 * (VtkEventRefresher), so the planner and the exported calendar do not wait on vtk.be on every
 * read and survive it being down.
 *
 * An event VTK no longer publishes is marked $goneAt rather than deleted: it drops out of the
 * planner and the calendar, and comes back if VTK publishes it again.
 */
#[ORM\Entity]
#[ORM\UniqueConstraint(name: 'uniq_study_planner_vtk_event', columns: ['planner_id', 'vtk_event_id'])]
class StudyPlannerVtkEvent extends BaseEntity
{
    #[ORM\ManyToOne(inversedBy: 'vtkEvents')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private StudyPlanner $planner;

    /** The id of the CalendarEvent on the VTK website. */
    #[ORM\Column(type: Types::STRING, length: 64)]
    private string $vtkEventId;

    #[ORM\Column(type: Types::STRING, length: 255)]
    private string $slug = '';

    #[ORM\Column(type: Types::STRING, length: 500)]
    private string $titleNl = '';

    #[ORM\Column(type: Types::STRING, length: 500, nullable: true)]
    private ?string $titleEn = null;

    #[ORM\Column(type: Types::STRING, length: 500, nullable: true)]
    private ?string $location = null;

    #[ORM\Column(type: Types::DATETIMETZ_IMMUTABLE)]
    private DateTimeImmutable $startsAt;

    #[ORM\Column(type: Types::DATETIMETZ_IMMUTABLE)]
    private DateTimeImmutable $endsAt;

    #[ORM\Column(type: Types::BOOLEAN)]
    private bool $allDay = false;

    #[ORM\Column(type: Types::STRING, length: 1000)]
    private string $urlNl = '';

    #[ORM\Column(type: Types::STRING, length: 1000)]
    private string $urlEn = '';

    /**
     * The separate moments of a series (a running week), each {start, end, label, location} with
     * ISO 8601 times. Empty for an ordinary event.
     *
     * @var list<array{start: string, end: string, label: ?string, location: ?string}>
     */
    #[ORM\Column(type: Types::JSON)]
    private array $moments = [];

    /** When this copy was last compared with the VTK website. */
    #[ORM\Column(type: Types::DATETIMETZ_IMMUTABLE)]
    private DateTimeImmutable $refreshedAt;

    #[ORM\Column(type: Types::DATETIMETZ_IMMUTABLE, nullable: true)]
    private ?DateTimeImmutable $goneAt = null;

    public function __construct(StudyPlanner $planner, string $vtkEventId)
    {
        $this->planner = $planner;
        $this->vtkEventId = $vtkEventId;
    }

    public function getPlanner(): StudyPlanner
    {
        return $this->planner;
    }

    public function getVtkEventId(): string
    {
        return $this->vtkEventId;
    }

    public function getSlug(): string
    {
        return $this->slug;
    }

    public function getTitleNl(): string
    {
        return $this->titleNl;
    }

    public function getTitleEn(): ?string
    {
        return $this->titleEn;
    }

    public function getLocation(): ?string
    {
        return $this->location;
    }

    public function getStartsAt(): DateTimeImmutable
    {
        return $this->startsAt;
    }

    public function getEndsAt(): DateTimeImmutable
    {
        return $this->endsAt;
    }

    public function isAllDay(): bool
    {
        return $this->allDay;
    }

    public function getUrlNl(): string
    {
        return $this->urlNl;
    }

    public function getUrlEn(): string
    {
        return $this->urlEn;
    }

    /**
     * @return list<array{start: string, end: string, label: ?string, location: ?string}>
     */
    public function getMoments(): array
    {
        return $this->moments;
    }

    public function getRefreshedAt(): DateTimeImmutable
    {
        return $this->refreshedAt;
    }

    public function getGoneAt(): ?DateTimeImmutable
    {
        return $this->goneAt;
    }

    /**
     * Takes over what the VTK website now says about the event (see VtkEvents::normalize).
     *
     * @param array{slug: string, titleNl: string, titleEn: ?string, location: ?string, start: DateTimeImmutable, end: DateTimeImmutable, allDay: bool, urlNl: string, urlEn: string, moments: list<array{start: string, end: string, label: ?string, location: ?string}>} $event
     */
    public function update(array $event, DateTimeImmutable $now): self
    {
        $this->slug = mb_substr($event['slug'], 0, 255);
        $this->titleNl = mb_substr($event['titleNl'], 0, 500);
        $this->titleEn = null === $event['titleEn'] ? null : mb_substr($event['titleEn'], 0, 500);
        $this->location = null === $event['location'] ? null : mb_substr($event['location'], 0, 500);
        if (!isset($this->startsAt) || $this->startsAt != $event['start']) {
            $this->startsAt = $event['start'];
        }
        if (!isset($this->endsAt) || $this->endsAt != $event['end']) {
            $this->endsAt = $event['end'];
        }
        $this->allDay = $event['allDay'];
        $this->urlNl = mb_substr($event['urlNl'], 0, 1000);
        $this->urlEn = mb_substr($event['urlEn'], 0, 1000);
        if ($this->moments !== $event['moments']) {
            $this->moments = $event['moments'];
        }
        $this->refreshedAt = $now;
        $this->goneAt = null;

        return $this;
    }

    public function markChecked(DateTimeImmutable $now): self
    {
        $this->refreshedAt = $now;

        return $this;
    }

    public function markGone(DateTimeImmutable $now): self
    {
        $this->goneAt ??= $now;
        $this->refreshedAt = $now;

        return $this;
    }
}
