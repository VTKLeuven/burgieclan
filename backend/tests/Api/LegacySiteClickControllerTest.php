<?php

namespace App\Tests\Api;

use App\Factory\UserFactory;
use App\Repository\LegacySiteClickRepository;

class LegacySiteClickControllerTest extends ApiTestCase
{
    public function testClickIsRecordedOncePerUserWithACounter(): void
    {
        $user = UserFactory::createOne(['plainPassword' => 'password']);
        $token = $this->getToken($user->getUsername(), 'password');

        $this->browser()
            ->post('/api/analytics/old-burgieclan-click')
            ->assertStatus(401);

        $options = [
            'headers' => [
                'Content-Type' => 'application/ld+json',
                'Authorization' => 'Bearer ' . $token,
            ],
            'json' => [],
        ];

        $this->browser()
            ->post('/api/analytics/old-burgieclan-click', $options)
            ->assertStatus(204)
            ->post('/api/analytics/old-burgieclan-click', $options)
            ->assertStatus(204);

        $repository = self::getContainer()->get(LegacySiteClickRepository::class);
        $click = $repository->findOneBy(['user' => $user]);

        $this->assertNotNull($click);
        $this->assertSame(2, $click->getClickCount());
        $this->assertSame($user->getId(), $click->getUser()->getId());
    }
}
