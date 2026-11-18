<?php

namespace App\Entity;

use App\Constants\Feature;
use App\Repository\FeatureFlagRepository;
use Doctrine\ORM\Mapping as ORM;

/**
 * Whether one App\Constants\Feature is switched on. One row per feature, created on first sight
 * in the admin (FeatureFlags::ensureRows), off until an admin turns it on.
 */
#[ORM\Entity(repositoryClass: FeatureFlagRepository::class)]
#[ORM\UniqueConstraint(name: 'uniq_feature_flag_name', columns: ['name'])]
class FeatureFlag extends BaseEntity
{
    #[ORM\Column(length: 64)]
    private string $name;

    #[ORM\Column(options: ['default' => false])]
    private bool $enabled = false;

    public function __construct(Feature $feature, bool $enabled = false)
    {
        $this->name = $feature->value;
        $this->enabled = $enabled;
    }

    public function getName(): string
    {
        return $this->name;
    }

    /** Null for a row whose feature has since been removed from the code. */
    public function getFeature(): ?Feature
    {
        return Feature::tryFrom($this->name);
    }

    public function getLabel(): string
    {
        return $this->getFeature()?->label() ?? $this->name;
    }

    public function getDescription(): string
    {
        return $this->getFeature()?->description() ?? 'No longer used.';
    }

    public function isEnabled(): bool
    {
        return $this->enabled;
    }

    public function setEnabled(bool $enabled): static
    {
        $this->enabled = $enabled;

        return $this;
    }

    public function __toString(): string
    {
        return $this->getLabel();
    }
}
