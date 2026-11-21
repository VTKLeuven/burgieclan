<?php

namespace App\Controller\Api;

use App\Entity\User;
use App\Service\RateLimit\UserRateLimiter;
use App\Service\VtkService\VtkStudy;
use RuntimeException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Target;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * The study timer of the "Blok" calendar as "Samen blokken" on vtk.be (VtkStudy). Nothing is
 * stored here.
 *
 * - GET /api/vtk_study: {"available": false} when this account cannot use it (no link with vtk.be,
 *   or an account that never signed in through VTK; the page then uses Burgieclan's own timer),
 *   else {"available": true, ...the state} (VtkStudy::normalize).
 * - POST /api/vtk_study {"action": "start"|"pause"|"resume"|"heartbeat"|"stop"}: the same, after
 *   the action. The page sends "heartbeat" every minute while it is open and a session runs.
 *
 * 502 when vtk.be cannot be reached.
 */
#[IsGranted(User::ROLE_USER)]
class VtkStudyController extends AbstractController
{
    public function __construct(
        private readonly VtkStudy $study,
    ) {}

    #[Route('/api/vtk_study', name: 'api_vtk_study', methods: ['GET'])]
    public function state(): JsonResponse
    {
        $user = $this->getUser();
        assert($user instanceof User);
        if (!$this->study->isAvailableFor($user)) {
            return self::private(['available' => false]);
        }

        try {
            return self::answer($this->study->state($user));
        } catch (RuntimeException) {
            return self::private(['detail' => 'The VTK website could not be reached.'], Response::HTTP_BAD_GATEWAY);
        }
    }

    #[Route('/api/vtk_study', name: 'api_vtk_study_action', methods: ['POST'])]
    public function act(
        Request $request,
        UserRateLimiter $rateLimiter,
        #[Target('study_planner_change')]
        RateLimiterFactoryInterface $limiter,
    ): JsonResponse {
        $user = $this->getUser();
        assert($user instanceof User);
        if (!$this->study->isAvailableFor($user)) {
            return self::private(['available' => false]);
        }

        $payload = json_decode($request->getContent(), true);
        $action = is_array($payload) ? ($payload['action'] ?? null) : null;
        if (!is_string($action) || !in_array($action, VtkStudy::ACTIONS, true)) {
            return self::private(['detail' => 'Expected {"action": "start"|"pause"|"resume"|"heartbeat"|"stop"}.'], Response::HTTP_BAD_REQUEST);
        }
        $rateLimiter->consume($limiter, 'Slow down a little. Try again in a minute.');

        try {
            return self::answer($this->study->act($user, $action));
        } catch (RuntimeException) {
            return self::private(['detail' => 'The VTK website could not be reached.'], Response::HTTP_BAD_GATEWAY);
        }
    }

    /**
     * @param array<string, mixed>|null $state null when vtk.be does not know this member
     */
    private static function answer(?array $state): JsonResponse
    {
        return self::private(null === $state ? ['available' => false] : ['available' => true] + $state);
    }

    /**
     * @param array<string, mixed> $data
     */
    private static function private(array $data, int $status = Response::HTTP_OK): JsonResponse
    {
        $response = new JsonResponse($data, $status);
        $response->setPrivate();
        $response->headers->addCacheControlDirective('no-store');

        return $response;
    }
}
