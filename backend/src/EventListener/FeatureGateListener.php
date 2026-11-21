<?php

namespace App\EventListener;

use App\Constants\Feature;
use App\Service\Feature\FeatureFlags;
use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\KernelEvents;

/**
 * Answers 404 on the public routes of a feature that is switched off, as if they did not exist.
 *
 * Runs right after routing (priority 32), so it can go by route name. What is not a route of its
 * own is gated where it happens: the collab token for an exam document (CollabDocumentVoter) and
 * exam questions in search (SearchController). The admin and the collab server's internal routes
 * are not gated: moderators keep managing reconstructions while students cannot see them.
 */
#[AsEventListener(event: KernelEvents::REQUEST, priority: 31)]
class FeatureGateListener
{
    /** Route-name prefixes per feature. */
    private const ROUTES = [
        Feature::EXAM_RECONSTRUCTIONS->value => [
            '_api_/exams',
            '_api_/exam_question_comments',
            'api_exam_image_',
            'exam_image_signed',
        ],
        Feature::EXCHANGE->value => [
            'api_exchange_',
        ],
    ];

    public function __construct(private readonly FeatureFlags $flags) {}

    public function __invoke(RequestEvent $event): void
    {
        $route = $event->getRequest()->attributes->get('_route');
        if (!is_string($route)) {
            return;
        }

        foreach (self::ROUTES as $feature => $prefixes) {
            foreach ($prefixes as $prefix) {
                if (str_starts_with($route, $prefix) && !$this->flags->isEnabled(Feature::from($feature))) {
                    throw new NotFoundHttpException(sprintf('%s are not available.', Feature::from($feature)->label()));
                }
            }
        }
    }
}
