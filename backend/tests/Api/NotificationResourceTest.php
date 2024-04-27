<?php

namespace Api;

use App\Factory\NotificationFactory;
use App\Tests\Api\ApiTestCase;
use DateInterval;
use DateTime;
use Zenstruck\Foundry\Test\Factories;
use Zenstruck\Foundry\Test\ResetDatabase;

class NotificationResourceTest extends ApiTestCase
{
    use ResetDatabase;
    use Factories;

    public function testGetCollectionOfNotifications(): void
    {
        NotificationFactory::createMany(5);
        $json = $this->browser()
            ->get('/api/notifications')
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 5)
            ->assertJsonMatches('length("hydra:member")', 5)
            ->json()
        ;

        $this->assertSame(array_keys($json->decoded()['hydra:member'][0]), [
            '@id',
            '@type',
            'title',
            'content',
            'creator',
            'startTime',
            'endTime',
            'createdAt',
            'updatedAt',
        ]);
    }

    public function testGetOneNotification(): void
    {
        $notification = NotificationFactory::createOne();

        $this->browser()
            ->get('/api/notifications/' . $notification->getId())
            ->assertJson()
            ->assertJsonMatches('"@id"', '/api/notifications/' . $notification->getId());
    }

    public function testGetNotificationFilterByTitle(): void
    {
        $notification1 = NotificationFactory::createOne([
            'title' => 'testnotification1',
        ]);

        $notification2 = NotificationFactory::createOne([
            'title' => 'testnotification2',
        ]);

        $notification3 = NotificationFactory::createOne([
            'title' => 'testnotification3',
        ]);

        NotificationFactory::createMany(5);

        $this->browser()
            ->get('/api/notifications?title=testnotification2')
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
            ->get('/api/notifications?title=testnotification')
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3)
        ;
    }

    public function testGetNotificationFilterByContent(): void
    {
        $notification1 = NotificationFactory::createOne([
            'content' => 'testnotification1',
        ]);

        $notification2 = NotificationFactory::createOne([
            'content' => 'testnotification2',
        ]);

        $notification3 = NotificationFactory::createOne([
            'content' => 'testnotification3',
        ]);

        NotificationFactory::createMany(5);

        $this->browser()
            ->get('/api/notifications?content=testnotification2')
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
            ->get('/api/notifications?content=testnotification')
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3)
        ;
    }

    public function testGetNotificationFilterByStartTime(): void
    {
        $startTime1 = (new DateTime());
        $notification1 = NotificationFactory::createOne([
            'startTime' => $startTime1,
        ]);

        $startTime2 = (new DateTime())->add(new DateInterval('P1D'));
        $notification2 = NotificationFactory::createOne([
            'startTime' => $startTime2,
        ]);

        $startTime3 = (new DateTime())->add(new DateInterval('P2D'));
        $notification3 = NotificationFactory::createOne([
            'startTime' => $startTime3,
        ]);

        $this->browser()
            ->get('/api/notifications?startTime[before]=' . $startTime2->format('Y-m-d H:i:s'))
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 2)
            ->assertJsonMatches('length("hydra:member")', 2)
            ->get('/api/notifications?startTime[strictly_before]=' . $startTime2->format('Y-m-d H:i:s'))
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
            ->get('/api/notifications?startTime[after]=' . $startTime2->format('Y-m-d H:i:s'))
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 2)
            ->assertJsonMatches('length("hydra:member")', 2)
            ->get('/api/notifications?startTime[strictly_after]=' . $startTime2->format('Y-m-d H:i:s'))
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
        ;
    }

    public function testGetNotificationFilterByEndTime(): void
    {
        $endTime1 = (new DateTime());
        $notification1 = NotificationFactory::createOne([
            'endTime' => $endTime1,
        ]);

        $endTime2 = (new DateTime())->add(new DateInterval('P1D'));
        $notification2 = NotificationFactory::createOne([
            'endTime' => $endTime2,
        ]);

        $endTime3 = (new DateTime())->add(new DateInterval('P2D'));
        $notification3 = NotificationFactory::createOne([
            'endTime' => $endTime3,
        ]);

        $this->browser()
            ->get('/api/notifications?endTime[before]=' . $endTime2->format('Y-m-d H:i:s'))
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 2)
            ->assertJsonMatches('length("hydra:member")', 2)
            ->get('/api/notifications?endTime[strictly_before]=' . $endTime2->format('Y-m-d H:i:s'))
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
            ->get('/api/notifications?endTime[after]=' . $endTime2->format('Y-m-d H:i:s'))
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 2)
            ->assertJsonMatches('length("hydra:member")', 2)
            ->get('/api/notifications?endTime[strictly_after]=' . $endTime2->format('Y-m-d H:i:s'))
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
        ;
    }
}