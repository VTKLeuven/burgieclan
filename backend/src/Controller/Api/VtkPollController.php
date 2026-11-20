<?php

namespace App\Controller\Api;

use App\Entity\User;
use App\Service\RateLimit\UserRateLimiter;
use App\Service\VtkService\VtkPolls;
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
 * The POC polls of the VTK website, for the signed-in member (VtkPolls). Nothing is stored here.
 *
 * - GET /api/vtk_polls?locale=nl|en: {"available", "polls", "missingProgramme"}. "available" is
 *   false when vtk.be cannot be asked for this account (no link configured, or an account that
 *   never signed in through VTK); the frontend then hides the polls tab altogether.
 * - POST /api/vtk_polls/answers {"pollId", "answers": {questionId: "1"}}: 204, or 409/422 with
 *   {"reason": code} as vtk.be refused it (VtkPolls::ERROR_CODES, or POLL_FAILED).
 */
#[IsGranted(User::ROLE_USER)]
class VtkPollController extends AbstractController
{
    public function __construct(
        private readonly VtkPolls $polls,
    ) {}

    #[Route('/api/vtk_polls', name: 'api_vtk_polls', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        $user = $this->getUser();
        assert($user instanceof User);

        if (!$this->polls->isAvailableFor($user)) {
            return self::private(['available' => false, 'polls' => [], 'missingProgramme' => false]);
        }

        try {
            $result = $this->polls->forUser($user, (string) $request->query->get('locale', 'nl'));
        } catch (RuntimeException) {
            return self::private(['detail' => 'The VTK website could not be reached.'], Response::HTTP_BAD_GATEWAY);
        }

        return self::private(['available' => true] + $result);
    }

    #[Route('/api/vtk_polls/answers', name: 'api_vtk_poll_answers', methods: ['POST'])]
    public function answer(
        Request $request,
        UserRateLimiter $rateLimiter,
        #[Target('vtk_poll_answer')]
        RateLimiterFactoryInterface $limiter,
    ): Response {
        $user = $this->getUser();
        assert($user instanceof User);

        $payload = json_decode($request->getContent(), true);
        $pollId = is_array($payload) ? ($payload['pollId'] ?? null) : null;
        $answers = is_array($payload) ? ($payload['answers'] ?? null) : null;
        if (
            !is_string($pollId) || '' === $pollId || strlen($pollId) > 64
            || !is_array($answers) || count($answers) > 20
            || [] !== array_filter($answers, static fn (mixed $value, int|string $key): bool => !is_string($key) || !is_string($value), ARRAY_FILTER_USE_BOTH)
        ) {
            return self::private(['detail' => 'Expected {"pollId": "...", "answers": {"<question id>": "<value>"}}.'], Response::HTTP_BAD_REQUEST);
        }

        $rateLimiter->consume($limiter, 'Slow down a little. Try again in a few minutes.');

        try {
            /** @var array<string, string> $answers */
            $code = $this->polls->answer($user, $pollId, $answers);
        } catch (RuntimeException) {
            return self::private(['detail' => 'The VTK website could not be reached.'], Response::HTTP_BAD_GATEWAY);
        }

        if (null === $code) {
            return new Response(null, Response::HTTP_NO_CONTENT);
        }

        return self::private(['reason' => $code, 'detail' => 'The VTK website did not accept these answers.'], 'POLL_CLOSED' === $code ? Response::HTTP_CONFLICT : Response::HTTP_UNPROCESSABLE_ENTITY);
    }

    /**
     * Per member: never kept by a proxy or the browser's HTTP cache.
     *
     * @param array<string, mixed> $data
     */
    private static function private(array $data, int $status = Response::HTTP_OK): JsonResponse
    {
        $response = new JsonResponse($data, $status);
        $response->headers->set('Cache-Control', 'private, no-store');

        return $response;
    }
}
