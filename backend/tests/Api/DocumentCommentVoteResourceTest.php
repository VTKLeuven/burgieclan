<?php

namespace Api;

use App\Factory\DocumentCommentFactory;
use App\Factory\DocumentCommentVoteFactory;
use App\Factory\UserFactory;
use App\Tests\Api\ApiTestCase;
use Zenstruck\Browser\HttpOptions;
use Zenstruck\Foundry\Test\Factories;
use Zenstruck\Foundry\Test\ResetDatabase;

class DocumentCommentVoteResourceTest extends ApiTestCase
{
    use ResetDatabase;
    use Factories;

    public function testGetCollectionOfDocumentCommentVotes(): void
    {
        DocumentCommentVoteFactory::createMany(5);

        $json = $this->browser()
            ->get('/api/document_comment_votes', [
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
            'documentComment',
            'creator',
            'createdAt',
            'updatedAt',
        ], array_keys($json->decoded()['hydra:member'][0]));
    }

    public function testGetOneDocumentCommentVote(): void
    {
        $commentVote = DocumentCommentVoteFactory::createOne();

        $this->browser()
            ->get('/api/document_comment_votes/' . $commentVote->getId(), [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"@id"', '/api/document_comment_votes/' . $commentVote->getId());
    }

    public function testGetDocumentCommentVoteFilterByIsUpvote(): void
    {
        $commentVote1 = DocumentCommentVoteFactory::createOne(['isUpvote' => true]);
        $commentVote2 = DocumentCommentVoteFactory::createOne(['isUpvote' => false]);
        $commentVote3 = DocumentCommentVoteFactory::createOne(['isUpvote' => true]);

        DocumentCommentVoteFactory::createMany(5);

        $this->browser()
            ->get('/api/document_comment_votes?isUpvote=true', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3);
    }

    public function testGetDocumentCommentVoteFilterByCreator(): void
    {
        $user1 = UserFactory::createOne();
        $user2 = UserFactory::createOne();
        DocumentCommentVoteFactory::createOne(['creator' => $user1]);
        DocumentCommentVoteFactory::createMany(2, ['creator' => $user2]);
        DocumentCommentVoteFactory::createMany(5);

        $this->browser()
            ->get('/api/document_comment_votes?creator=/api/users/' . $user1->getId(), [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
            ->get('/api/document_comment_votes?creator[]=/api/users/' . $user1->getId() .
                '&creator[]=/api/users/' . $user2->getId(), [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3)
            ->get('/api/document_comment_votes', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 8)
            ->assertJsonMatches('length("hydra:member")', 8);
    }

    public function testPostToCreateDocumentCommentVote(): void
    {
        $user = UserFactory::createOne(['plainPassword' => 'password']);
        $documentComment = DocumentCommentFactory::createOne();

        $this->browser()
            ->post('/api/document_comment_votes', [
                'json' => [],
                'headers' => [
                    'Content-Type' => 'application/ld+json',
                    'Authorization' => 'Bearer ' . $this->getToken($user->getUsername(), 'password')
                ],
            ])
            ->assertStatus(422)
            ->assertJsonMatches('message', 'Validation Failed')
            ->post('/api/document_comment_votes', [
                'json' => [
                    'isUpvote' => true,
                    'documentComment' => '/api/document_comments/' . $documentComment->getId(),
                ],
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->getToken($user->getUsername(), 'password')
                ]
            ])
            ->assertStatus(201)
            ->assertJsonMatches('isUpvote', true);
    }

    public function testPatchToUpdateDocumentCommentVote(): void
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

        $commentVote = DocumentCommentVoteFactory::createOne(['creator' => $creator]);

        $this->browser()
            ->patch('/api/document_comment_votes/' . $commentVote->getId(), [
                'json' => ['content' => 'Some new content'],
                'headers' => [
                    'Content-Type' => 'application/merge-patch+json',
                    'Authorization' => 'Bearer ' . $creatorToken
                ]
            ])
            ->assertStatus(200)
            ->assertJsonMatches('content', 'Some new content');

        $this->browser()
            ->patch('/api/document_comment_votes/' . $commentVote->getId(), [
                'json' => ['content' => 'Some new content'],
                'headers' => [
                    'Content-Type' => 'application/merge-patch+json',
                    'Authorization' => 'Bearer ' . $otherToken
                ]
            ])
            ->assertStatus(403);
    }

    public function testDeleteDocumentCommentVote(): void
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

        $commentVote = DocumentCommentVoteFactory::createOne(['creator' => $creator]);
        $commentVoteId = $commentVote->getId();

        $this->browser()
            ->get('/api/document_comment_votes/' . $commentVoteId, [
                'headers' => [
                    'Authorization' => 'Bearer ' . $creatorToken
                ]
            ])
            ->assertStatus(200);

        $this->browser()
            ->delete('/api/document_comment_votes/' . $commentVoteId, [
                'headers' => [
                    'Authorization' => 'Bearer ' . $otherToken
                ]
            ])
            ->assertStatus(403);

        $this->browser()
            ->delete('/api/document_comment_votes/' . $commentVoteId, [
                'headers' => [
                    'Authorization' => 'Bearer ' . $creatorToken
                ]
            ])
            ->assertStatus(204);

        $this->browser()
            ->get('/api/document_comment_votes/' . $commentVoteId, [
                'headers' => [
                    'Authorization' => 'Bearer ' . $creatorToken
                ]
            ])
            ->assertStatus(404);
    }
}
