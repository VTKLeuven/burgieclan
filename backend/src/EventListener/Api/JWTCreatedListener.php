<?php

namespace App\EventListener\Api;

use App\Entity\User;
use Lexik\Bundle\JWTAuthenticationBundle\Event\JWTCreatedEvent;

class JWTCreatedListener
{
    /**
     * @param JWTCreatedEvent $event
     * @return void
     */
    public function onJWTCreated(JWTCreatedEvent $event): void
    {
        $user = $event->getUser();
        if ($user instanceof User) {
            $payload = $event->getData();
            $payload['id'] = $user->getId();
            $payload['fullName'] = $user->getFullName();
            $event->setData($payload);
        }
    }
}
