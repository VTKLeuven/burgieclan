<?php

namespace Api;

use App\Factory\DocumentFactory;
use App\Factory\DocumentVoteFactory;
use App\Factory\UserFactory;
use App\Tests\Api\ApiTestCase;
use Zenstruck\Browser\HttpOptions;
use Zenstruck\Foundry\Test\Factories;
use Zenstruck\Foundry\Test\ResetDatabase;

class DocumentVoteResourceTest extends ApiTestCase
{
    use ResetDatabase;
    use Factories;

    public function testGetCollectionOfDocumentVotes(): void
    {
        DocumentVoteFactory::createMany(5);

        $json = $this->browser()
            ->get('/api/document_votes', [
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
            'isUpvote',
            'document',
            'creator',
            'createdAt',
            'updatedAt',
        ], array_keys($json->decoded()['hydra:member'][0]));
    }

    public function testGetOneDocumentVote(): void
    {
        $documentVote = DocumentVoteFactory::createOne();

        $this->browser()
            ->get('/api/document_votes/' . $documentVote->getId(), [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"@id"', '/api/document_votes/' . $documentVote->getId());
    }

    public function testGetDocumentVoteFilterByIsUpvote(): void
    {
        $vote1 = DocumentVoteFactory::createOne(['isUpvote' => true]);
        $vote2 = DocumentVoteFactory::createOne(['isUpvote' => false]);
        $vote3 = DocumentVoteFactory::createOne(['isUpvote' => true]);

        $this->browser()
            ->get('/api/document_votes?isUpvote=true', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 2)
            ->assertJsonMatches('length("hydra:member")', 2);
    }

    public function testGetDocumentVoteFilterByCreator(): void
    {
        $user1 = UserFactory::createOne();
        $user2 = UserFactory::createOne();
        DocumentVoteFactory::createOne(['creator' => $user1]);
        DocumentVoteFactory::createMany(2, ['creator' => $user2]);

        $this->browser()
            ->get('/api/document_votes?creator=/api/users/' . $user1->getId(), [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
            ->get('/api/document_votes?creator[]=/api/users/' . $user1->getId() .
                '&creator[]=/api/users/' . $user2->getId(), [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3)
            ->get('/api/document_votes', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3);
    }

    public function testPostToCreateDocumentVote(): void
    {
        $user = UserFactory::createOne(['plainPassword' => 'password']);
        $document = DocumentFactory::createOne();

        $this->browser()
            ->post('/api/document_votes', [
                'json' => [],
                'headers' => [
                    'Content-Type' => 'application/ld+json',
                    'Authorization' => 'Bearer ' . $this->getToken($user->getUsername(), 'password')
                ],
            ])
            ->assertStatus(422)
            ->post('/api/document_votes', [
                'json' => [
                    'isUpvote' => true,
                    'document' => '/api/documents/' . $document->getId(),
                ],
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->getToken($user->getUsername(), 'password')
                ]
            ])
            ->assertStatus(201)
            ->assertJsonMatches('isUpvote', true);
    }

    public function testPatchToUpdateDocumentVote(): void
    {
        $creator = UserFactory::createOne(['username' => 'creator', 'plainPassword' => 'password']);
        $otherUser = UserFactory::createOne(['username' => 'other_user', 'plainPassword' => 'password']);

        $creatorTokenResponse = $this->browser()
            ->post('/api/auth/login', HttpOptions::json([
                'username' => $creator->getUsername(),
                'password' => 'password',
            ]))
            ->json()
            ->decoded();
        $creatorToken = $creatorTokenResponse['token'];

        $otherUserTokenResponse = $this->browser()
            ->post('/api/auth/login', HttpOptions::json([
                'username' => $otherUser->getUsername(),
                'password' => 'password',
            ]))
            ->json()
            ->decoded();
        $otherToken = $otherUserTokenResponse['token'];

        $documentVote = DocumentVoteFactory::createOne(['creator' => $creator]);

        $this->browser()
            ->patch('/api/document_votes/' . $documentVote->getId(), [
                'json' => ['isUpvote' => false],
                'headers' => [
                    'Content-Type' => 'application/merge-patch+json',
                    'Authorization' => 'Bearer ' . $creatorToken
                ]
            ])
            ->assertStatus(200)
            ->assertJsonMatches('isUpvote', false);

        $this->browser()
            ->patch('/api/document_votes/' . $documentVote->getId(), [
                'json' => ['isUpvote' => false],
                'headers' => [
                    'Content-Type' => 'application/merge-patch+json',
                    'Authorization' => 'Bearer ' . $otherToken
                ]
            ])
            ->assertStatus(403);
    }

    public function testDeleteDocumentVote(): void
    {
        $creator = UserFactory::createOne(['username' => 'creator', 'plainPassword' => 'password']);
        $otherUser = UserFactory::createOne(['username' => 'other_user', 'plainPassword' => 'password']);

        $creatorTokenResponse = $this->browser()
            ->post('/api/auth/login', HttpOptions::json([
                'username' => $creator->getUsername(),
                'password' => 'password',
            ]))
            ->json()
            ->decoded();
        $creatorToken = $creatorTokenResponse['token'];

        $otherUserTokenResponse = $this->browser()
            ->post('/api/auth/login', HttpOptions::json([
                'username' => $otherUser->getUsername(),
                'password' => 'password',
            ]))
            ->json()
            ->decoded();
        $otherToken = $otherUserTokenResponse['token'];

        $documentVote = DocumentVoteFactory::createOne(['creator' => $creator]);
        $documentVoteId = $documentVote->getId();

        $this->browser()
            ->get('/api/document_votes/' . $documentVoteId, [
                'headers' => [
                    'Authorization' => 'Bearer ' . $creatorToken
                ]
            ])
            ->assertStatus(200);

        $this->browser()
            ->delete('/api/document_votes/' . $documentVoteId, [
                'headers' => [
                    'Authorization' => 'Bearer ' . $otherToken
                ]
            ])
            ->assertStatus(403);

        $this->browser()
            ->delete('/api/document_votes/' . $documentVoteId, [
                'headers' => [
                    'Authorization' => 'Bearer ' . $creatorToken
                ]
            ])
            ->assertStatus(204);

        $this->browser()
            ->get('/api/document_votes/' . $documentVoteId, [
                'headers' => [
                    'Authorization' => 'Bearer ' . $creatorToken
                ]
            ])
            ->assertStatus(404);
    }
}
