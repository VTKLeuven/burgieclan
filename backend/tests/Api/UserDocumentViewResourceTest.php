<?php

namespace App\Tests\Api;

use App\Factory\CourseFactory;
use App\Factory\DocumentFactory;
use App\Factory\UserDocumentViewFactory;
use App\Factory\UserFactory;
use Zenstruck\Foundry\Test\Factories;
use Zenstruck\Foundry\Test\ResetDatabase;

class UserDocumentViewResourceTest extends ApiTestCase
{
    use ResetDatabase;
    use Factories;

    public function testGetRecentDocuments(): void
    {
        $user = UserFactory::createOne(['plainPassword' => 'password']);
        $userToken = $this->getToken($user->getUsername(), 'password');

        $course = CourseFactory::createOne();
        $document1 = DocumentFactory::createOne(
            [
            'course' => $course,
            ]
        );
        $document2 = DocumentFactory::createOne();

        UserDocumentViewFactory::createOne(
            [
            'user' => $user,
            'document' => $document1,
            'lastViewed' => new \DateTime('2024-02-01'),
            ]
        );
        UserDocumentViewFactory::createOne(
            [
            'user' => $user,
            'document' => $document2,
            'lastViewed' => new \DateTime('2024-01-02'),
            ]
        );

        // Test getting own document views
        $this->browser()
            ->get(
                '/api/document_views',
                [
                'headers' => [
                    'Authorization' => 'Bearer ' . $userToken
                ]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 2)
            ->assertJsonMatches('length("hydra:member")', 2)
            ->assertJsonMatches('"hydra:member"[0].document."@id"', '/api/documents/' . $document1->getId())
            ->assertJsonMatches('"hydra:member"[0].document.course."@id"', '/api/courses/' . $course->getId())
            ->assertJsonMatches('"hydra:member"[1].document."@id"', '/api/documents/' . $document2->getId());
    }

    public function testBatchAddDocumentViews(): void
    {
        $user = UserFactory::createOne(['plainPassword' => 'password']);
        $userToken = $this->getToken($user->getUsername(), 'password');

        $document1 = DocumentFactory::createOne();
        $document2 = DocumentFactory::createOne();

        // Test adding document views for own user
        $this->browser()
            ->post(
                '/api/document_views/batch',
                [
                'headers' => [
                    'Content-Type' => 'application/ld+json',
                    'Authorization' => 'Bearer ' . $userToken
                ],
                'json' => [
                    'userDocumentViews' => [
                        [
                            'document' => '/api/documents/' . $document1->getId(),
                            'lastViewed' => '2024-01-02T10:00:00+00:00'
                        ],
                        [
                            'document' => '/api/documents/' . $document2->getId(),
                            'lastViewed' => '2024-01-01T10:00:00+00:00'
                        ]
                    ]
                ]
                ]
            )
            ->assertStatus(204);

        // Verify the views were recorded
        $this->browser()
            ->get(
                '/api/document_views',
                [
                'headers' => [
                    'Authorization' => 'Bearer ' . $userToken
                ]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 2)
            ->assertJsonMatches('length("hydra:member")', 2)
            ->assertJsonMatches('"hydra:member"[0].document."@id"', '/api/documents/' . $document1->getId())
            ->assertJsonMatches('"hydra:member"[1].document."@id"', '/api/documents/' . $document2->getId());
    }

    public function testUpdateExistingDocumentView(): void
    {
        $user = UserFactory::createOne(['plainPassword' => 'password']);
        $userToken = $this->getToken($user->getUsername(), 'password');

        $document = DocumentFactory::createOne();

        // Create initial view
        UserDocumentViewFactory::createOne(
            [
            'user' => $user,
            'document' => $document,
            'lastViewed' => new \DateTime('2024-01-01T10:00:00+00:00'),
            ]
        );

        // Update the view
        $this->browser()
            ->post(
                '/api/document_views/batch',
                [
                'headers' => [
                    'Content-Type' => 'application/ld+json',
                    'Authorization' => 'Bearer ' . $userToken
                ],
                'json' => [
                    'userDocumentViews' => [
                        [
                            'document' => '/api/documents/' . $document->getId(),
                            'lastViewed' => '2024-01-02T10:00:00+00:00'
                        ]
                    ]
                ]
                ]
            )
            ->assertStatus(204);

        // Verify the view was updated
        $this->browser()
            ->get(
                '/api/document_views',
                [
                'headers' => [
                    'Authorization' => 'Bearer ' . $userToken
                ]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
            ->assertJsonMatches('"hydra:member"[0].document."@id"', '/api/documents/' . $document->getId())
            ->assertJsonMatches('"hydra:member"[0].lastViewed', '2024-01-02T10:00:00+00:00');
    }
}
