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
            ->get('/api/document_comments')
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 5)
            ->assertJsonMatches('length("hydra:member")', 5)
            ->json()
        ;

        $this->assertSame(array_keys($json->decoded()['hydra:member'][0]), [
            '@id',
            '@type',
            'content',
            'anonymous',
            'document',
            'creator',
            'createdAt',
            'updatedAt',
        ]);
    }

    public function testGetOneDocumentComments(): void
    {
        $comment = DocumentCommentFactory::createOne();

        $this->browser()
            ->get('/api/document_comments/' . $comment->getId())
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
            ->get('/api/document_comments?content=comment2')
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
            ->get('/api/document_comments?content=comment')
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
            ->get('/api/document_comments?anonymous=true')
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3)
            ->get('/api/document_comments?anonymous=false')
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 5)
            ->assertJsonMatches('length("hydra:member")', 5)
        ;
    }

    public function testPostToCreateDocumentComment(): void
    {
        $user = UserFactory::createOne();
        $document = DocumentFactory::createOne();

        $this->browser()
            ->actingAs($user)
            ->post('/api/document_comments', [
                'json' => [],
                'headers' => [
                    'Content-Type' => 'application/ld+json',
                ],
            ])
            ->assertStatus(422)
            ->post('/api/document_comments', HttpOptions::json([
                'content' => 'The content of this comment',
                'anonymous' => true,
                'document' => '/api/documents/' . $document->getId(),
            ]))
            ->assertStatus(201)
            ->assertJsonMatches('content', 'The content of this comment')
        ;
    }

    public function testPatchToUpdateDocumentComment()
    {
        $comment = DocumentCommentFactory::createOne();

        $this->browser()
            ->patch('/api/document_comments/'.$comment->getId(), [
                'json' => [
                    'content' => 'Some new content',
                ],
                'headers' => ['Content-Type' => 'application/merge-patch+json']
            ])
            ->assertStatus(200)
            ->assertJsonMatches('content', 'Some new content')
        ;
    }

    public function testDeleteDocumentComment(){
        $comment = DocumentCommentFactory::createOne();
        $commentId = $comment->getId();

        $this->browser()
            ->get('/api/document_comments/' . $commentId)
            ->assertStatus(200);

        $this->browser()
            ->delete('/api/document_comments/' . $commentId)
            ->assertStatus(204);

        $this->browser()
            ->get('/api/document_comments/' . $commentId)
            ->assertStatus(404);
    }
}