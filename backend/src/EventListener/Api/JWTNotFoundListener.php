<?php

namespace App\EventListener\Api;

use Lexik\Bundle\JWTAuthenticationBundle\Event\JWTNotFoundEvent;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class JWTNotFoundListener
{
    /**
     * @param JWTNotFoundEvent $event
     * @return void
     */
    public function onJWTNotFound(JWTNotFoundEvent $event): void
    {
        $data = [
            'title' => 'An error occurred',
            'detail' => 'JWT not found.',
            'status' => Response::HTTP_UNAUTHORIZED,
        ];

        $response = new JsonResponse($data, Response::HTTP_UNAUTHORIZED);
        $event->setResponse($response);
    }
}
