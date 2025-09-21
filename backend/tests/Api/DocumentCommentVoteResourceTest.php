<?php

namespace Api;

use App\Entity\DocumentCommentVote;
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
        $documentComments = DocumentCommentFactory::createMany(5);
        foreach ($documentComments as $comment) {
            DocumentCommentVoteFactory::createOne(['documentComment' => $comment]);
        }

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
            'voteType',
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

    public function testGetDocumentCommentVoteFilterByVoteType(): void
    {
        $comments = DocumentCommentFactory::createMany(3);
        $commentVote1 = DocumentCommentVoteFactory::createOne(['voteType' => DocumentCommentVote::UPVOTE, 'documentComment' => $comments[0]]);
        $commentVote2 = DocumentCommentVoteFactory::createOne(['voteType' => DocumentCommentVote::DOWNVOTE, 'documentComment' => $comments[1]]);
        $commentVote3 = DocumentCommentVoteFactory::createOne(['voteType' => DocumentCommentVote::UPVOTE, 'documentComment' => $comments[2]]);

        $this->browser()
            ->get('/api/document_comment_votes?voteType=1', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 2)
            ->assertJsonMatches('length("hydra:member")', 2);

        $this->browser()
            ->get('/api/document_comment_votes?voteType=-1', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1);
    }

    public function testGetDocumentCommentVoteFilterByCreator(): void
    {
        $user1 = UserFactory::createOne();
        $user2 = UserFactory::createOne();
        $comments = DocumentCommentFactory::createMany(2);
        DocumentCommentVoteFactory::createOne(['creator' => $user1, 'documentComment' => $comments[0]]);
        DocumentCommentVoteFactory::createOne(['creator' => $user2, 'documentComment' => $comments[0]]);
        DocumentCommentVoteFactory::createOne(['creator' => $user2, 'documentComment' => $comments[1]]);

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
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3);
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
            ->post('/api/document_comment_votes', [
                'json' => [
                    'voteType' => 1,
                    'documentComment' => '/api/document_comments/' . $documentComment->getId(),
                ],
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->getToken($user->getUsername(), 'password')
                ]
            ])
            ->assertStatus(201)
            ->assertJsonMatches('voteType', 1);
    }

    public function testPatchToUpdateDocumentCommentVote(): void
    {
        $creator = UserFactory::createOne(['username' => 'creator', 'plainPassword' => 'password']);
        $otherUser = UserFactory::createOne(['username' => 'other_user', 'plainPassword' => 'password']);

        $creatorToken = $this->getToken($creator->getUsername(), 'password');
        $otherToken = $this->getToken($otherUser->getUsername(), 'password');

        $commentVote = DocumentCommentVoteFactory::createOne(['creator' => $creator]);
        $documentComment = DocumentCommentFactory::createOne();

        $this->browser()
            ->patch('/api/document_comment_votes/' . $commentVote->getId(), [
                'json' => ['documentComment' => '/api/document_comments/' . $documentComment->getId()],
                'headers' => [
                    'Content-Type' => 'application/merge-patch+json',
                    'Authorization' => 'Bearer ' . $creatorToken
                ]
            ])
            ->assertStatus(200)
            ->assertJsonMatches('documentComment', '/api/document_comments/' . $documentComment->getId());

        $this->browser()
            ->patch('/api/document_comment_votes/' . $commentVote->getId(), [
                'json' => ['documentComment' => '/api/document_comments/' . $documentComment->getId()],
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