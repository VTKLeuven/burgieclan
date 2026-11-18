<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\ApiResource\StudyPlannerApi;
use App\ApiResource\StudyPlannerOperationInput;
use App\ApiResource\StudyPlannerSubscriptionInput;
use App\Entity\StudyPlanner;
use App\Entity\User;
use App\Service\RateLimit\UserRateLimiter;
use App\Service\StudyPlanner\StudyPlannerOperations;
use App\Service\StudyPlanner\StudyPlannerState;
use App\Service\StudyPlanner\StudyPlannerSync;
use App\Service\StudyPlanner\TimetableUrl;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\DependencyInjection\Attribute\Target;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;

/**
 * Every change to the caller's study planner (see StudyPlannerApi). Answers with the whole
 * planner, or nothing after unsubscribing.
 *
 * @implements ProcessorInterface<StudyPlannerSubscriptionInput|StudyPlannerOperationInput|null, StudyPlannerApi|null>
 */
class StudyPlannerProcessor implements ProcessorInterface
{
    public const SUBSCRIBE = 'study_planner_subscribe';
    public const UNSUBSCRIBE = 'study_planner_unsubscribe';
    public const SYNC = 'study_planner_sync';
    public const OPERATION = 'study_planner_operation';
    public const ROTATE_FEED = 'study_planner_rotate_feed';

    public function __construct(
        private readonly StudyPlannerProvider $provider,
        private readonly StudyPlannerSync $sync,
        private readonly StudyPlannerState $state,
        private readonly StudyPlannerOperations $operations,
        private readonly EntityManagerInterface $entityManager,
        private readonly Security $security,
        private readonly UserRateLimiter $rateLimiter,
        #[Target('study_planner_sync')]
        private readonly RateLimiterFactoryInterface $syncLimiter,
        #[Target('study_planner_change')]
        private readonly RateLimiterFactoryInterface $changeLimiter,
    ) {}

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): ?StudyPlannerApi
    {
        $planner = $this->provider->planner();

        switch ($operation->getName()) {
            case self::SUBSCRIBE:
                assert($data instanceof StudyPlannerSubscriptionInput);

                return $this->subscribe($planner, (string) $data->icsUrl);

            case self::UNSUBSCRIBE:
                if (null !== $planner) {
                    $this->entityManager->remove($planner);
                    $this->entityManager->flush();
                }

                return null;

            case self::SYNC:
                $planner = $this->required($planner);
                $this->rateLimiter->consume($this->syncLimiter, 'You just synced. Try again in a minute.');
                $this->sync->sync($planner);

                return $this->state->build($planner);

            case self::OPERATION:
                assert($data instanceof StudyPlannerOperationInput);
                $planner = $this->required($planner);
                $this->rateLimiter->consume($this->changeLimiter, 'Slow down a little. Try again in a minute.');
                $this->operations->apply($planner, $data);

                return $this->state->build($planner);

            case self::ROTATE_FEED:
                $planner = $this->required($planner);
                $planner->rotateFeedToken();
                $this->entityManager->flush();

                return $this->state->build($planner);
        }

        throw new NotFoundHttpException();
    }

    private function required(?StudyPlanner $planner): StudyPlanner
    {
        return $planner ?? throw new NotFoundHttpException('Add your timetable first.');
    }

    private function subscribe(?StudyPlanner $planner, string $link): StudyPlannerApi
    {
        $url = TimetableUrl::normalize($link);
        if (null === $url) {
            throw new UnprocessableEntityHttpException(
                'This is not a KU Leuven timetable link. Copy the subscription link from the KU Leuven timetable (it starts with webcal://cloud.timeedit.net/be_kuleuven/).'
            );
        }
        $this->rateLimiter->consume($this->syncLimiter, 'You just synced. Try again in a minute.');

        if (null === $planner) {
            $user = $this->security->getUser();
            assert($user instanceof User);
            $planner = new StudyPlanner($user, $url);
            $this->entityManager->persist($planner);
        } elseif ($planner->getIcsUrl() !== $url) {
            // Possibly someone else's timetable: the stored sessions and their marks no longer apply.
            $planner->setIcsUrl($url)->resetTimetable();
        }
        // Delete the old sessions before the sync adds the new ones: they may share UIDs.
        $this->entityManager->flush();

        $this->sync->sync($planner);

        return $this->state->build($planner);
    }
}
