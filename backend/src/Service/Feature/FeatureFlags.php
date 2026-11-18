<?php

namespace App\Service\Feature;

use App\Constants\Feature;
use App\Entity\FeatureFlag;
use App\Repository\FeatureFlagRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Contracts\Service\ResetInterface;

/**
 * Reads the admin's feature switches (App\Constants\Feature). A feature without a row is off.
 *
 * The switches are read once per request; reset() drops them between requests.
 */
class FeatureFlags implements ResetInterface
{
    /** @var array<string, bool>|null */
    private ?array $enabled = null;

    public function __construct(
        private readonly FeatureFlagRepository $repository,
        private readonly EntityManagerInterface $entityManager,
    ) {}

    public function isEnabled(Feature $feature): bool
    {
        return $this->all()[$feature->value];
    }

    /**
     * Every known feature and whether it is on.
     *
     * @return array<string, bool>
     */
    public function all(): array
    {
        if (null === $this->enabled) {
            $stored = [];
            foreach ($this->repository->findAll() as $flag) {
                $stored[$flag->getName()] = $flag->isEnabled();
            }

            $this->enabled = [];
            foreach (Feature::cases() as $feature) {
                $this->enabled[$feature->value] = $stored[$feature->value] ?? false;
            }
        }

        return $this->enabled;
    }

    /**
     * Creates the missing rows, switched off, so the admin lists every feature there is.
     */
    public function ensureRows(): void
    {
        $existing = array_map(static fn(FeatureFlag $flag): string => $flag->getName(), $this->repository->findAll());

        $created = false;
        foreach (Feature::cases() as $feature) {
            if (!in_array($feature->value, $existing, true)) {
                $this->entityManager->persist(new FeatureFlag($feature));
                $created = true;
            }
        }

        if ($created) {
            $this->entityManager->flush();
        }
    }

    public function reset(): void
    {
        $this->enabled = null;
    }
}
