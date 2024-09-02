<?php

namespace App\EventListener\Api;

use Lexik\Bundle\JWTAuthenticationBundle\Event\JWTInvalidEvent;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class JWTInvalidListener
{
    /**
     * @param JWTInvalidEvent $event
     * @return void
     */
    public function onJWTInvalid(JWTInvalidEvent $event): void
    {
        $data = [
            'title' => 'An error occurred',
            'detail' => 'Invalid JWT, please login again to get a new one.',
            'status' => Response::HTTP_UNAUTHORIZED,
        ];

        $response = new JsonResponse($data, Response::HTTP_UNAUTHORIZED);
        $event->setResponse($response);
    }
}
