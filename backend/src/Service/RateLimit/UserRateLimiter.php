<?php

namespace App\Service\RateLimit;

use App\Entity\User;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;

/**
 * Applies one of the per-user limits in config/packages/rate_limiter.yaml to whoever is logged
 * in. Moderators are exempt. Going over answers 429 Too Many Requests with Retry-After.
 */
class UserRateLimiter
{
    public function __construct(
        private readonly Security $security,
    ) {}

    /**
     * @throws TooManyRequestsHttpException
     */
    public function consume(RateLimiterFactoryInterface $limiter, string $message): void
    {
        $user = $this->security->getUser();
        if (!$user instanceof User || $this->security->isGranted(User::ROLE_MODERATOR)) {
            return;
        }

        $limit = $limiter->create((string) $user->getId())->consume();
        if (!$limit->isAccepted()) {
            throw new TooManyRequestsHttpException(max(1, $limit->getRetryAfter()->getTimestamp() - time()), $message);
        }
    }
}
