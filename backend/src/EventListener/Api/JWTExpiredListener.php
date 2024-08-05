<?php

namespace App\EventListener\Api;

use Lexik\Bundle\JWTAuthenticationBundle\Event\JWTExpiredEvent;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class JWTExpiredListener
{
    /**
     * @param JWTExpiredEvent $event
     * @return void
     */
    public function onJWTExpired(JWTExpiredEvent $event): void
    {
        $data = [
            'title' => 'An error occurred',
            'detail' => 'Expired JWT, please renew it.',
            'status' => Response::HTTP_UNAUTHORIZED,
        ];

        $response = new JsonResponse($data, Response::HTTP_UNAUTHORIZED);
        $event->setResponse($response);
    }
}
