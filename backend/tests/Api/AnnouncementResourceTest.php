<?php

namespace App\Tests\Api;

use App\Factory\AnnouncementFactory;
use DateInterval;
use DateTime;
use Zenstruck\Foundry\Test\Factories;
use Zenstruck\Foundry\Test\ResetDatabase;

class AnnouncementResourceTest extends ApiTestCase
{
    use ResetDatabase;
    use Factories;

    public function testGetCollectionOfAnnouncements(): void
    {
        AnnouncementFactory::createMany(5);
        $json = $this->browser()
            ->get('/api/announcements', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 5)
            ->assertJsonMatches('length("hydra:member")', 5)
            ->json();

        $this->assertEqualsCanonicalizing([
            '@id',
            '@type',
            'title',
            'content',
            'creator',
            'startTime',
            'endTime',
            'createdAt',
            'updatedAt',
            'priority',
        ], array_keys($json->decoded()['hydra:member'][0]));
    }

    public function testGetOneAnnouncement(): void
    {
        $announcement = AnnouncementFactory::createOne();

        $this->browser()
            ->get('/api/announcements/' . $announcement->getId(), [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"@id"', '/api/announcements/' . $announcement->getId());
    }

    public function testGetAnnouncementFilterByTitle(): void
    {
        $announcement1 = AnnouncementFactory::createOne([
            'title_nl' => 'testannouncement1',
            'title_en' => 'testannouncement1_en',
        ]);

        $announcement2 = AnnouncementFactory::createOne([
            'title_nl' => 'testannouncement2',
            'title_en' => 'testannouncement2_en',
        ]);

        $announcement3 = AnnouncementFactory::createOne([
            'title_nl' => 'testannouncement3',
            'title_en' => 'testannouncement3_en',
        ]);

        AnnouncementFactory::createMany(5);

        $this->browser()
            ->get('/api/announcements?title=testannouncement2', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
            ->get('/api/announcements?title=testannouncement', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3)
        ;
    }

    public function testGetAnnouncementFilterByContent(): void
    {
        $announcement1 = AnnouncementFactory::createOne([
            'content_nl' => 'testannouncement1',
            'content_en' => 'testannouncement1_en',
        ]);

        $announcement2 = AnnouncementFactory::createOne([
            'content_nl' => 'testannouncement2',
            'content_en' => 'testannouncement2_en',
        ]);

        $announcement3 = AnnouncementFactory::createOne([
            'content_nl' => 'testannouncement3',
            'content_en' => 'testannouncement3_en',
        ]);

        AnnouncementFactory::createMany(5);

        $this->browser()
            ->get('/api/announcements?content=testannouncement2', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
            ->get('/api/announcements?content=testannouncement', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3)
        ;
    }

    public function testGetAnnouncementFilterByStartTime(): void
    {
        $startTime1 = (new DateTime());
        $announcement1 = AnnouncementFactory::createOne([
            'startTime' => $startTime1,
        ]);

        $startTime2 = (new DateTime())->add(new DateInterval('P1D'));
        $announcement2 = AnnouncementFactory::createOne([
            'startTime' => $startTime2,
        ]);

        $startTime3 = (new DateTime())->add(new DateInterval('P2D'));
        $announcement3 = AnnouncementFactory::createOne([
            'startTime' => $startTime3,
        ]);

        $this->browser()
            ->get('/api/announcements?startTime[before]=' . $startTime2->format('Y-m-d H:i:s'), [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 2)
            ->assertJsonMatches('length("hydra:member")', 2)
            ->get('/api/announcements?startTime[strictly_before]=' . $startTime2->format('Y-m-d H:i:s'), [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
            ->get('/api/announcements?startTime[after]=' . $startTime2->format('Y-m-d H:i:s'), [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 2)
            ->assertJsonMatches('length("hydra:member")', 2)
            ->get('/api/announcements?startTime[strictly_after]=' . $startTime2->format('Y-m-d H:i:s'), [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
        ;
    }

    public function testGetAnnouncementFilterByEndTime(): void
    {
        $endTime1 = (new DateTime());
        $announcement1 = AnnouncementFactory::createOne([
            'endTime' => $endTime1,
        ]);

        $endTime2 = (new DateTime())->add(new DateInterval('P1D'));
        $announcement2 = AnnouncementFactory::createOne([
            'endTime' => $endTime2,
        ]);

        $endTime3 = (new DateTime())->add(new DateInterval('P2D'));
        $announcement3 = AnnouncementFactory::createOne([
            'endTime' => $endTime3,
        ]);

        $this->browser()
            ->get('/api/announcements?endTime[before]=' . $endTime2->format('Y-m-d H:i:s'), [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 2)
            ->assertJsonMatches('length("hydra:member")', 2)
            ->get('/api/announcements?endTime[strictly_before]=' . $endTime2->format('Y-m-d H:i:s'), [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
            ->get('/api/announcements?endTime[after]=' . $endTime2->format('Y-m-d H:i:s'), [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 2)
            ->assertJsonMatches('length("hydra:member")', 2)
            ->get('/api/announcements?endTime[strictly_after]=' . $endTime2->format('Y-m-d H:i:s'), [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
        ;
    }

    public function testGetAnnouncementWithLanguageParameter(): void
    {
        $announcement = AnnouncementFactory::createOne([
            'title_nl' => 'Nederlandse titel',
            'title_en' => 'English title',
            'content_nl' => 'Nederlandse inhoud',
            'content_en' => 'English content',
        ]);

        // Test Dutch (default)
        $json = $this->browser()
            ->get('/api/announcements/' . $announcement->getId(), [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('title', 'Nederlandse titel')
            ->assertJsonMatches('content', 'Nederlandse inhoud')
            ->json();

        // Test Dutch explicitly
        $this->browser()
            ->get('/api/announcements/' . $announcement->getId() . '?lang=nl', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('title', 'Nederlandse titel')
            ->assertJsonMatches('content', 'Nederlandse inhoud');

        // Test English
        $this->browser()
            ->get('/api/announcements/' . $announcement->getId() . '?lang=en', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('title', 'English title')
            ->assertJsonMatches('content', 'English content');
    }

    public function testGetAnnouncementCollectionWithLanguageParameter(): void
    {
        $announcement1 = AnnouncementFactory::createOne([
            'title_nl' => 'Nederlandse titel 1',
            'title_en' => 'English title 1',
            'content_nl' => 'Nederlandse inhoud 1',
            'content_en' => 'English content 1',
        ]);

        $announcement2 = AnnouncementFactory::createOne([
            'title_nl' => 'Nederlandse titel 2',
            'title_en' => 'English title 2',
            'content_nl' => 'Nederlandse inhoud 2',
            'content_en' => 'English content 2',
        ]);

        // Test Dutch (default)
        $json = $this->browser()
            ->get('/api/announcements', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 2)
            ->json();

        $this->assertSame($json->decoded()['hydra:member'][0]['title'], 'Nederlandse titel 1');
        $this->assertSame($json->decoded()['hydra:member'][0]['content'], 'Nederlandse inhoud 1');

        // Test English
        $json = $this->browser()
            ->get('/api/announcements?lang=en', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 2)
            ->json();

        $this->assertSame($json->decoded()['hydra:member'][0]['title'], 'English title 1');
        $this->assertSame($json->decoded()['hydra:member'][0]['content'], 'English content 1');
    }

    public function testGetAnnouncementLanguageFallback(): void
    {
        // Create announcement with only Dutch content (English fields empty but not null)
        $announcement = AnnouncementFactory::createOne([
            'title_nl' => 'Nederlandse titel',
            'title_en' => '',
            'content_nl' => 'Nederlandse inhoud',
            'content_en' => '',
        ]);

        // Test English request should fallback to Dutch
        $this->browser()
            ->get('/api/announcements/' . $announcement->getId() . '?lang=en', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('title', 'Nederlandse titel')
            ->assertJsonMatches('content', 'Nederlandse inhoud');
    }
}
