<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\ApiResource\StudyPlannerApi;
use App\Entity\StudyPlanner;
use App\Entity\User;
use App\Repository\StudyPlannerRepository;
use App\Service\StudyPlanner\StudyPlannerState;
use App\Service\StudyPlanner\StudyPlannerSync;
use Symfony\Bundle\SecurityBundle\Security;

/**
 * GET /api/study_planner: the caller's own planner, synced first when it is stale.
 *
 * @implements ProviderInterface<StudyPlannerApi>
 */
class StudyPlannerProvider implements ProviderInterface
{
    public function __construct(
        private readonly StudyPlannerRepository $planners,
        private readonly StudyPlannerSync $sync,
        private readonly StudyPlannerState $state,
        private readonly Security $security,
    ) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): StudyPlannerApi
    {
        $planner = $this->planner();
        if (null !== $planner) {
            $this->sync->syncIfStale($planner);
        }

        return $this->state->build($planner);
    }

    public function planner(): ?StudyPlanner
    {
        $user = $this->security->getUser();
        assert($user instanceof User);

        return $this->planners->findForUser($user);
    }
}
