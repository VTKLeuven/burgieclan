<?php

namespace App\Tests\Api;

use App\Factory\DocumentCommentFactory;
use App\Factory\DocumentFactory;
use App\Factory\UserFactory;
use Zenstruck\Browser\HttpOptions;
use Zenstruck\Foundry\Test\Factories;
use Zenstruck\Foundry\Test\ResetDatabase;

class DocumentCommentResourceTest extends ApiTestCase
{
    use ResetDatabase;
    use Factories;

    public function testGetCollectionOfDocumentComments(): void
    {
        DocumentCommentFactory::createMany(5);
        $json = $this->browser()
            ->get('/api/document_comments', [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 5)
            ->assertJsonMatches('length("hydra:member")', 5)
            ->json()
        ;

        $this->assertEqualsCanonicalizing([
            '@id',
            '@type',
            'content',
            'anonymous',
            'document',
            'creator',
            'createdAt',
            'updatedAt',
        ], array_keys($json->decoded()['hydra:member'][0]));
    }

    public function testGetOneDocumentComments(): void
    {
        $comment = DocumentCommentFactory::createOne();

        $this->browser()
            ->get('/api/document_comments/' . $comment->getId(), [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"@id"', '/api/document_comments/' . $comment->getId());
    }

    public function testGetDocumentCommentsFilterByContent(): void
    {
        $comment1 = DocumentCommentFactory::createOne([
            'content' => 'comment1',
        ]);

        $comment2 = DocumentCommentFactory::createOne([
            'content' => 'comment2',
        ]);

        $comment3 = DocumentCommentFactory::createOne([
            'content' => 'comment3',
        ]);

        DocumentCommentFactory::createMany(5);

        $this->browser()
            ->get('/api/document_comments?content=comment2', [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
            ->get('/api/document_comments?content=comment', [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3)
        ;
    }

    public function testGetDocumentCommentFilterByAnonymous(): void
    {
        DocumentCommentFactory::createMany(3, [
            'anonymous' => true,
        ]);
        DocumentCommentFactory::createMany(5, [
            'anonymous' => false,
        ]);

        $this->browser()
            ->get('/api/document_comments?anonymous=true', [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3)
            ->get('/api/document_comments?anonymous=false', [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 5)
            ->assertJsonMatches('length("hydra:member")', 5)
        ;
    }

    public function testGetDocumentCommentFilterByDocument(): void
    {
        $document1 = DocumentFactory::createOne();
        $document2 = DocumentFactory::createOne();
        DocumentCommentFactory::createMany(1, [
            'document' => $document1,
        ]);
        DocumentCommentFactory::createMany(2, [
            'document' => $document2,
        ]);
        DocumentCommentFactory::createMany(5, [
            'document' => DocumentFactory::createOne(),
        ]);

        $this->browser()
            ->get('/api/document_comments?document=/api/documents/' . $document1->getId(), [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
            ->get('/api/document_comments?document[]=/api/documents/' . $document1->getId() .
                '&document[]=/api/documents/' . $document2->getId(), [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3)
            ->get('/api/document_comments', [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 8)
            ->assertJsonMatches('length("hydra:member")', 8)
        ;
    }

    public function testGetDocumentCommentFilterByCreator(): void
    {
        $user1 = UserFactory::createOne();
        $user2 = UserFactory::createOne();
        DocumentCommentFactory::createMany(1, [
            'creator' => $user1,
        ]);
        DocumentCommentFactory::createMany(2, [
            'creator' => $user2,
        ]);
        DocumentCommentFactory::createMany(5, [
            'creator' => UserFactory::createOne(),
        ]);

        $this->browser()
            ->get('/api/document_comments?creator=/api/users/' . $user1->getId(), [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
            ->get('/api/document_comments?creator[]=/api/users/' . $user1->getId() .
                '&creator[]=/api/users/' . $user2->getId(), [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3)
            ->get('/api/document_comments', [
                'headers' => [
                    'Authorization' =>'Bearer ' . $this->token
                ]
            ])
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 8)
            ->assertJsonMatches('length("hydra:member")', 8)
        ;
    }

    public function testPostToCreateDocumentComment(): void
    {
        $user = UserFactory::createOne();
        $document = DocumentFactory::createOne();

        $this->browser()
            ->post('/api/document_comments', [
                'json' => [],
                'headers' => [
                    'Content-Type' => 'application/ld+json',
                    'Authorization' =>'Bearer ' . $this->token
                ],
            ])
            ->assertStatus(422)
            ->post('/api/document_comments',
                [
                    'json' => [
                        'content' => 'The content of this comment',
                        'anonymous' => true,
                        'document' => '/api/documents/' . $document->getId(),
                    ],
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->token
                    ]
                ])
            ->assertStatus(201)
            ->assertJsonMatches('content', 'The content of this comment')
        ;
    }

    public function testPatchToUpdateDocumentComment()
    {
        $creator = UserFactory::createOne(
            [
                'username' => 'creator',
                'plainPassword' => 'password'
            ]);
        $otherUser = UserFactory::createOne(
            [
                'username' => 'other user',
                'plainPassword' => 'password']);

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

        $comment = DocumentCommentFactory::createOne([
            'creator' => $creator,
        ]);

        $this->browser()
            ->patch('/api/document_comments/' . $comment->getId(), [
                'json' => [
                    'content' => 'Some new content',
                ],
                'headers' => [
                    'Content-Type' => 'application/merge-patch+json',
                    'Authorization' =>'Bearer ' . $creatorToken
                ]
            ])
            ->assertStatus(200)
            ->assertJsonMatches('content', 'Some new content');

        $this->browser()
            ->patch('/api/document_comments/' . $comment->getId(), [
                'json' => [
                    'content' => 'Some new content',
                ],
                'headers' => [
                    'Content-Type' => 'application/merge-patch+json',
                    'Authorization' =>'Bearer ' . $otherToken
                ]
            ])
            ->assertStatus(403);
    }

    public function testDeleteDocumentComment(){
        $creator = UserFactory::createOne(
            [
                'username' => 'creator',
                'plainPassword' => 'password'
            ]);
        $otherUser = UserFactory::createOne(
            [
                'username' => 'other user',
                'plainPassword' => 'password']);

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

        $comment = DocumentCommentFactory::createOne(
            [
                'creator' => $creator,
            ]
        );
        $commentId = $comment->getId();

        $this->browser()
            ->get('/api/document_comments/' . $commentId, [
                'headers' => [
                    'Authorization' =>'Bearer ' . $creatorToken
                ]
            ])
            ->assertStatus(200);

        $this->browser()
            ->delete('/api/document_comments/' . $commentId, [
                'headers' => [
                    'Authorization' =>'Bearer ' . $otherToken
                ]
            ])
            ->assertStatus(403);

        $this->browser()
            ->delete('/api/document_comments/' . $commentId, [
                'headers' => [
                    'Authorization' =>'Bearer ' . $creatorToken
                ]
            ])
            ->assertStatus(204);

        $this->browser()
            ->get('/api/document_comments/' . $commentId, [
                'headers' => [
                    'Authorization' =>'Bearer ' . $creatorToken
                ]
            ])
            ->assertStatus(404);
    }
}