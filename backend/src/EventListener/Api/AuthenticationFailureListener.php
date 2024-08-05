<?php

namespace App\EventListener\Api;

use Lexik\Bundle\JWTAuthenticationBundle\Event\AuthenticationFailureEvent;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class AuthenticationFailureListener
{
    /**
     * @param AuthenticationFailureEvent $event
     * @return void
     */
    public function onAuthenticationFailureResponse(AuthenticationFailureEvent $event): void
    {
        $data = [
            'title' => 'An error occurred',
            'detail' => 'Bad credentials, please verify that your username/password are correctly set.',
            'status' => 401,
        ];

        $response = new JsonResponse($data, Response::HTTP_UNAUTHORIZED);
        $event->setResponse($response);
    }
}
