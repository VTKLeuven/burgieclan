<?php

namespace Api;

use App\Entity\AbstractVote;
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
        $documents = DocumentFactory::createMany(5);
        foreach ($documents as $document) {
            DocumentVoteFactory::createOne(['document' => $document]);
        }

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
            'voteType',
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

    public function testGetDocumentVoteFilterByVoteType(): void
    {
        $documents = DocumentFactory::createMany(3);
        $vote1 = DocumentVoteFactory::createOne(['voteType' => AbstractVote::UPVOTE, 'document' => $documents[0]]);
        $vote2 = DocumentVoteFactory::createOne(['voteType' => AbstractVote::DOWNVOTE, 'document' => $documents[1]]);
        $vote3 = DocumentVoteFactory::createOne(['voteType' => AbstractVote::UPVOTE, 'document' => $documents[2]]);

        $this->browser()
            ->get('/api/document_votes?voteType=1', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 2)
            ->assertJsonMatches('length("hydra:member")', 2);

        $this->browser()
            ->get('/api/document_votes?voteType=-1', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1);
    }

    public function testGetDocumentVoteFilterByCreator(): void
    {
        $user1 = UserFactory::createOne();
        $user2 = UserFactory::createOne();
        $documents = DocumentFactory::createMany(2);
        DocumentVoteFactory::createOne(['creator' => $user1, 'document' => $documents[0]]);
        DocumentVoteFactory::createOne(['creator' => $user2, 'document' => $documents[0]]);
        DocumentVoteFactory::createOne(['creator' => $user2, 'document' => $documents[1]]);

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
                    'voteType' => 1,
                    'document' => '/api/documents/' . $document->getId(),
                ],
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->getToken($user->getUsername(), 'password')
                ]
            ])
            ->assertStatus(201)
            ->assertJsonMatches('voteType', 1);
    }

    public function testPatchToUpdateDocumentVote(): void
    {
        $creator = UserFactory::createOne(['username' => 'creator', 'plainPassword' => 'password']);
        $otherUser = UserFactory::createOne(['username' => 'other_user', 'plainPassword' => 'password']);

        $creatorToken = $this->getToken($creator->getUsername(), 'password');
        $otherToken = $this->getToken($otherUser->getUsername(), 'password');

        $document = DocumentFactory::createOne();
        $documentVote = DocumentVoteFactory::createOne(['creator' => $creator, 'document' => $document]);

        $this->browser()
            ->patch('/api/document_votes/' . $documentVote->getId(), [
                'json' => ['voteType' => -1],
                'headers' => [
                    'Content-Type' => 'application/merge-patch+json',
                    'Authorization' => 'Bearer ' . $creatorToken
                ]
            ])
            ->assertStatus(200)
            ->assertJsonMatches('voteType', -1);

        $this->browser()
            ->patch('/api/document_votes/' . $documentVote->getId(), [
                'json' => ['voteType' => 1],
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