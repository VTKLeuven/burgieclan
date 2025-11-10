<?php

namespace App\Tests\Api;

use App\Entity\AbstractVote;
use App\Factory\CourseCommentFactory;
use App\Factory\CourseCommentVoteFactory;
use App\Factory\DocumentCommentFactory;
use App\Factory\DocumentCommentVoteFactory;
use App\Factory\DocumentFactory;
use App\Factory\DocumentVoteFactory;
use App\Factory\UserFactory;
use Zenstruck\Foundry\Test\Factories;
use Zenstruck\Foundry\Test\ResetDatabase;

class VoteResourceTest extends ApiTestCase
{
    use ResetDatabase;
    use Factories;

    public function testGetDocumentVoteSummary(): void
    {
        $document = DocumentFactory::createOne();

        // No votes initially
        $this->browser()
            ->get(
                '/api/documents/' . $document->getId() . '/votes',
                [
                'headers' => ['Authorization' => 'Bearer ' . $this->token]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('upvotes', 0)
            ->assertJsonMatches('downvotes', 0)
            ->assertJsonMatches('sum', 0);

        // Create some votes manually in the database for testing
        $user1 = UserFactory::createOne(['plainPassword' => 'password']);
        $user2 = UserFactory::createOne(['plainPassword' => 'password']);
        $user3 = UserFactory::createOne(['plainPassword' => 'password']);

        $user1Token = $this->getToken($user1->getUsername(), 'password');
        $user2Token = $this->getToken($user2->getUsername(), 'password');
        $user3Token = $this->getToken($user3->getUsername(), 'password');

        // Create votes directly through the entities (simulating existing votes)
        $vote1 = DocumentVoteFactory::createOne(
            [
            'creator' => $user1,
            'document' => $document,
            'voteType' => AbstractVote::UPVOTE,
            ]
        );

        $vote2 = DocumentVoteFactory::createOne(
            [
            'creator' => $user2,
            'document' => $document,
            'voteType' => AbstractVote::UPVOTE,
            ]
        );

        $vote3 = DocumentVoteFactory::createOne(
            [
            'creator' => $user3,
            'document' => $document,
            'voteType' => AbstractVote::DOWNVOTE,
            ]
        );

        // Test vote summary with votes
        $this->browser()
            ->get(
                '/api/documents/' . $document->getId() . '/votes',
                [
                'headers' => ['Authorization' => 'Bearer ' . $user1Token]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('upvotes', 2)
            ->assertJsonMatches('downvotes', 1)
            ->assertJsonMatches('sum', 1)
            ->assertJsonMatches('currentUserVote', 1);

        $this->browser()
            ->get(
                '/api/documents/' . $document->getId() . '/votes',
                [
                'headers' => ['Authorization' => 'Bearer ' . $user2Token]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('upvotes', 2)
            ->assertJsonMatches('downvotes', 1)
            ->assertJsonMatches('sum', 1)
            ->assertJsonMatches('currentUserVote', 1);

        $this->browser()
            ->get(
                '/api/documents/' . $document->getId() . '/votes',
                [
                'headers' => ['Authorization' => 'Bearer ' . $user3Token]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('upvotes', 2)
            ->assertJsonMatches('downvotes', 1)
            ->assertJsonMatches('sum', 1)
            ->assertJsonMatches('currentUserVote', -1);
    }

    public function testGetDocumentCommentVoteSummary(): void
    {
        $documentComment = DocumentCommentFactory::createOne();

        $this->browser()
            ->get(
                '/api/document-comments/' . $documentComment->getId() . '/votes',
                [
                'headers' => ['Authorization' => 'Bearer ' . $this->token]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('upvotes', 0)
            ->assertJsonMatches('downvotes', 0)
            ->assertJsonMatches('sum', 0);

        $user1 = UserFactory::createOne(['plainPassword' => 'password']);
        $user2 = UserFactory::createOne(['plainPassword' => 'password']);
        $user3 = UserFactory::createOne(['plainPassword' => 'password']);

        $user1Token = $this->getToken($user1->getUsername(), 'password');
        $user2Token = $this->getToken($user2->getUsername(), 'password');
        $user3Token = $this->getToken($user3->getUsername(), 'password');

        $vote1 = DocumentCommentVoteFactory::createOne(
            [
            'creator' => $user1,
            'documentComment' => $documentComment,
            'voteType' => AbstractVote::UPVOTE,
            ]
        );

        $vote2 = DocumentCommentVoteFactory::createOne(
            [
            'creator' => $user2,
            'documentComment' => $documentComment,
            'voteType' => AbstractVote::UPVOTE,
            ]
        );

        $vote3 = DocumentCommentVoteFactory::createOne(
            [
            'creator' => $user3,
            'documentComment' => $documentComment,
            'voteType' => AbstractVote::DOWNVOTE,
            ]
        );

        $this->browser()
            ->get(
                '/api/document-comments/' . $documentComment->getId() . '/votes',
                [
                'headers' => ['Authorization' => 'Bearer ' . $user1Token]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('upvotes', 2)
            ->assertJsonMatches('downvotes', 1)
            ->assertJsonMatches('sum', 1)
            ->assertJsonMatches('currentUserVote', 1);

        $this->browser()
            ->get(
                '/api/document-comments/' . $documentComment->getId() . '/votes',
                [
                'headers' => ['Authorization' => 'Bearer ' . $user2Token]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('upvotes', 2)
            ->assertJsonMatches('downvotes', 1)
            ->assertJsonMatches('sum', 1)
            ->assertJsonMatches('currentUserVote', 1);

        $this->browser()
            ->get(
                '/api/document-comments/' . $documentComment->getId() . '/votes',
                [
                'headers' => ['Authorization' => 'Bearer ' . $user3Token]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('upvotes', 2)
            ->assertJsonMatches('downvotes', 1)
            ->assertJsonMatches('sum', 1)
            ->assertJsonMatches('currentUserVote', -1);
    }

    public function testGetCourseCommentVoteSummary(): void
    {
        $courseComment = CourseCommentFactory::createOne();

        $this->browser()
            ->get(
                '/api/course-comments/' . $courseComment->getId() . '/votes',
                [
                'headers' => ['Authorization' => 'Bearer ' . $this->token]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('upvotes', 0)
            ->assertJsonMatches('downvotes', 0)
            ->assertJsonMatches('sum', 0);

        $user1 = UserFactory::createOne(['plainPassword' => 'password']);
        $user2 = UserFactory::createOne(['plainPassword' => 'password']);
        $user3 = UserFactory::createOne(['plainPassword' => 'password']);

        $user1Token = $this->getToken($user1->getUsername(), 'password');
        $user2Token = $this->getToken($user2->getUsername(), 'password');
        $user3Token = $this->getToken($user3->getUsername(), 'password');

        $vote1 = CourseCommentVoteFactory::createOne(
            [
            'creator' => $user1,
            'courseComment' => $courseComment,
            'voteType' => AbstractVote::UPVOTE,
            ]
        );

        $vote2 = CourseCommentVoteFactory::createOne(
            [
            'creator' => $user2,
            'courseComment' => $courseComment,
            'voteType' => AbstractVote::UPVOTE,
            ]
        );

        $vote3 = CourseCommentVoteFactory::createOne(
            [
            'creator' => $user3,
            'courseComment' => $courseComment,
            'voteType' => AbstractVote::DOWNVOTE,
            ]
        );

        $this->browser()
            ->get(
                '/api/course-comments/' . $courseComment->getId() . '/votes',
                [
                'headers' => ['Authorization' => 'Bearer ' . $user1Token]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('upvotes', 2)
            ->assertJsonMatches('downvotes', 1)
            ->assertJsonMatches('sum', 1)
            ->assertJsonMatches('currentUserVote', 1);

        $this->browser()
            ->get(
                '/api/course-comments/' . $courseComment->getId() . '/votes',
                [
                'headers' => ['Authorization' => 'Bearer ' . $user2Token]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('upvotes', 2)
            ->assertJsonMatches('downvotes', 1)
            ->assertJsonMatches('sum', 1)
            ->assertJsonMatches('currentUserVote', 1);

        $this->browser()
            ->get(
                '/api/course-comments/' . $courseComment->getId() . '/votes',
                [
                'headers' => ['Authorization' => 'Bearer ' . $user3Token]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('upvotes', 2)
            ->assertJsonMatches('downvotes', 1)
            ->assertJsonMatches('sum', 1)
            ->assertJsonMatches('currentUserVote', -1);
    }

    public function testGetVoteSummaryForNonExistentEntity(): void
    {
        $this->browser()
            ->get(
                '/api/documents/99999/votes',
                [
                'headers' => ['Authorization' => 'Bearer ' . $this->token]
                ]
            )
            ->assertStatus(404);

        $this->browser()
            ->get(
                '/api/document-comments/99999/votes',
                [
                'headers' => ['Authorization' => 'Bearer ' . $this->token]
                ]
            )
            ->assertStatus(404);

        $this->browser()
            ->get(
                '/api/course-comments/99999/votes',
                [
                'headers' => ['Authorization' => 'Bearer ' . $this->token]
                ]
            )
            ->assertStatus(404);
    }

    public function testCreateDocumentVote(): void
    {
        $user = UserFactory::createOne(['plainPassword' => 'password']);
        $document = DocumentFactory::createOne();
        $token = $this->getToken($user->getUsername(), 'password');

        // Create upvote
        $this->browser()
            ->post(
                '/api/documents/' . $document->getId() . '/votes',
                [
                'json' => ['voteType' => 1],
                'headers' => [
                    'Authorization' => 'Bearer ' . $token,
                    'Content-Type' => 'application/ld+json'
                ]
                ]
            )
            ->assertStatus(201)
            ->assertJson()
            ->assertJsonMatches('voteType', 1)
            ->assertJsonMatches('document', '/api/documents/' . $document->getId());

        // Try to create same vote again (should return existing vote)
        $this->browser()
            ->post(
                '/api/documents/' . $document->getId() . '/votes',
                [
                'json' => ['voteType' => 1],
                'headers' => [
                    'Authorization' => 'Bearer ' . $token,
                    'Content-Type' => 'application/ld+json'
                ]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('voteType', 1);

        // Update to downvote
        $this->browser()
            ->post(
                '/api/documents/' . $document->getId() . '/votes',
                [
                'json' => ['voteType' => -1],
                'headers' => [
                    'Authorization' => 'Bearer ' . $token,
                    'Content-Type' => 'application/ld+json'
                ]
                ]
            )
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('voteType', -1);
    }

    public function testCreateDocumentCommentVote(): void
    {
        $user = UserFactory::createOne(['plainPassword' => 'password']);
        $documentComment = DocumentCommentFactory::createOne();
        $token = $this->getToken($user->getUsername(), 'password');

        $this->browser()
            ->post(
                '/api/document-comments/' . $documentComment->getId() . '/votes',
                [
                'json' => ['voteType' => 1],
                'headers' => [
                    'Authorization' => 'Bearer ' . $token,
                    'Content-Type' => 'application/ld+json'
                ]
                ]
            )
            ->assertStatus(201)
            ->assertJson()
            ->assertJsonMatches('voteType', 1)
            ->assertJsonMatches('documentComment', '/api/document_comments/' . $documentComment->getId());
    }

    public function testCreateCourseCommentVote(): void
    {
        $user = UserFactory::createOne(['plainPassword' => 'password']);
        $courseComment = CourseCommentFactory::createOne();
        $token = $this->getToken($user->getUsername(), 'password');

        $this->browser()
            ->post(
                '/api/course-comments/' . $courseComment->getId() . '/votes',
                [
                'json' => ['voteType' => -1],
                'headers' => [
                    'Authorization' => 'Bearer ' . $token,
                    'Content-Type' => 'application/ld+json'
                ]
                ]
            )
            ->assertStatus(201)
            ->assertJson()
            ->assertJsonMatches('voteType', -1)
            ->assertJsonMatches('courseComment', '/api/course_comments/' . $courseComment->getId());
    }

    public function testCreateVoteWithInvalidVoteType(): void
    {
        $user = UserFactory::createOne(['plainPassword' => 'password']);
        $document = DocumentFactory::createOne();
        $token = $this->getToken($user->getUsername(), 'password');

        // Invalid vote type
        $this->browser()
            ->post(
                '/api/documents/' . $document->getId() . '/votes',
                [
                'json' => ['voteType' => 2],
                'headers' => [
                    'Authorization' => 'Bearer ' . $token,
                    'Content-Type' => 'application/ld+json'
                ]
                ]
            )
            ->assertStatus(400);

        // Missing vote type
        $this->browser()
            ->post(
                '/api/documents/' . $document->getId() . '/votes',
                [
                'json' => [],
                'headers' => [
                    'Authorization' => 'Bearer ' . $token,
                    'Content-Type' => 'application/ld+json'
                ]
                ]
            )
            ->assertStatus(400);
    }

    public function testCreateVoteOnNonExistentEntity(): void
    {
        $user = UserFactory::createOne(['plainPassword' => 'password']);
        $token = $this->getToken($user->getUsername(), 'password');

        $this->browser()
            ->post(
                '/api/documents/99999/votes',
                [
                'json' => ['voteType' => 1],
                'headers' => [
                    'Authorization' => 'Bearer ' . $token,
                    'Content-Type' => 'application/ld+json'
                ]
                ]
            )
            ->assertStatus(404);

        $this->browser()
            ->post(
                '/api/document-comments/99999/votes',
                [
                'json' => ['voteType' => 1],
                'headers' => [
                    'Authorization' => 'Bearer ' . $token,
                    'Content-Type' => 'application/ld+json'
                ]
                ]
            )
            ->assertStatus(404);

        $this->browser()
            ->post(
                '/api/course-comments/99999/votes',
                [
                'json' => ['voteType' => 1],
                'headers' => [
                    'Authorization' => 'Bearer ' . $token,
                    'Content-Type' => 'application/ld+json'
                ]
                ]
            )
            ->assertStatus(404);
    }

    public function testCreateVoteRequiresAuthentication(): void
    {
        $document = DocumentFactory::createOne();
        $documentComment = DocumentCommentFactory::createOne();
        $courseComment = CourseCommentFactory::createOne();

        $this->browser()
            ->post(
                '/api/documents/' . $document->getId() . '/votes',
                [
                'json' => ['voteType' => 1],
                'headers' => [
                    'Content-Type' => 'application/ld+json'
                ]
                ]
            )
            ->assertStatus(401);

        $this->browser()
            ->post(
                '/api/document-comments/' . $documentComment->getId() . '/votes',
                [
                'json' => ['voteType' => 1],
                'headers' => [
                    'Content-Type' => 'application/ld+json'
                ]
                ]
            )
            ->assertStatus(401);

        $this->browser()
            ->post(
                '/api/course-comments/' . $courseComment->getId() . '/votes',
                [
                'json' => ['voteType' => 1],
                'headers' => [
                    'Content-Type' => 'application/ld+json'
                ]
                ]
            )
            ->assertStatus(401);
    }

    public function testDeleteDocumentVote(): void
    {
        $user = UserFactory::createOne(['plainPassword' => 'password']);
        $document = DocumentFactory::createOne();
        $token = $this->getToken($user->getUsername(), 'password');

        // Create a vote first
        $this->browser()
            ->post(
                '/api/documents/' . $document->getId() . '/votes',
                [
                'json' => ['voteType' => 1],
                'headers' => [
                    'Authorization' => 'Bearer ' . $token,
                    'Content-Type' => 'application/ld+json'
                ]
                ]
            )
            ->assertStatus(201);

        // Get vote summary
        $this->browser()
            ->get(
                '/api/documents/' . $document->getId() . '/votes',
                [
                'headers' => [
                    'Authorization' => 'Bearer ' . $token,
                    'Content-Type' => 'application/ld+json'
                ]
                ]
            )
            ->assertStatus(200)
            ->assertJsonMatches('upvotes', 1)
            ->assertJsonMatches('downvotes', 0)
            ->assertJsonMatches('sum', 1);

        // Delete the vote
        $this->browser()
            ->delete(
                '/api/documents/' . $document->getId() . '/votes',
                [
                'headers' => [
                    'Authorization' => 'Bearer ' . $token,
                    'Content-Type' => 'application/ld+json'
                ]
                ]
            )
            ->assertStatus(204);

        // Try to delete again (should return 404)
        $this->browser()
            ->delete(
                '/api/documents/' . $document->getId() . '/votes',
                [
                'headers' => [
                    'Authorization' => 'Bearer ' . $token,
                    'Content-Type' => 'application/ld+json'
                ]
                ]
            )
            ->assertStatus(404);
    }

    public function testDeleteDocumentCommentVote(): void
    {
        $user = UserFactory::createOne(['plainPassword' => 'password']);
        $documentComment = DocumentCommentFactory::createOne();
        $token = $this->getToken($user->getUsername(), 'password');

        // Create a vote first
        $this->browser()
            ->post(
                '/api/document-comments/' . $documentComment->getId() . '/votes',
                [
                'json' => ['voteType' => 1],
                'headers' => [
                    'Authorization' => 'Bearer ' . $token,
                    'Content-Type' => 'application/ld+json'
                ]
                ]
            )
            ->assertStatus(201);

        // Delete the vote
        $this->browser()
            ->delete(
                '/api/document-comments/' . $documentComment->getId() . '/votes',
                [
                'headers' => [
                    'Authorization' => 'Bearer ' . $token,
                    'Content-Type' => 'application/ld+json'
                ]
                ]
            )
            ->assertStatus(204);
    }

    public function testDeleteCourseCommentVote(): void
    {
        $user = UserFactory::createOne(['plainPassword' => 'password']);
        $courseComment = CourseCommentFactory::createOne();
        $token = $this->getToken($user->getUsername(), 'password');

        // Create a vote first
        $this->browser()
            ->post(
                '/api/course-comments/' . $courseComment->getId() . '/votes',
                [
                'json' => ['voteType' => 1],
                'headers' => [
                    'Authorization' => 'Bearer ' . $token,
                    'Content-Type' => 'application/ld+json'
                ]
                ]
            )
            ->assertStatus(201);

        // Delete the vote
        $this->browser()
            ->delete(
                '/api/course-comments/' . $courseComment->getId() . '/votes',
                [
                'headers' => [
                    'Authorization' => 'Bearer ' . $token,
                    'Content-Type' => 'application/ld+json'
                ]
                ]
            )
            ->assertStatus(204);
    }

    public function testDeleteVoteOnNonExistentEntity(): void
    {
        $user = UserFactory::createOne(['plainPassword' => 'password']);
        $token = $this->getToken($user->getUsername(), 'password');

        $this->browser()
            ->delete(
                '/api/documents/99999/votes',
                [
                'headers' => [
                    'Authorization' => 'Bearer ' . $token,
                    'Content-Type' => 'application/ld+json'
                ]
                ]
            )
            ->assertStatus(404);

        $this->browser()
            ->delete(
                '/api/document-comments/99999/votes',
                [
                'headers' => [
                    'Authorization' => 'Bearer ' . $token,
                    'Content-Type' => 'application/ld+json'
                ]
                ]
            )
            ->assertStatus(404);

        $this->browser()
            ->delete(
                '/api/course-comments/99999/votes',
                [
                'headers' => [
                    'Authorization' => 'Bearer ' . $token,
                    'Content-Type' => 'application/ld+json'
                ]
                ]
            )
            ->assertStatus(404);
    }

    public function testDeleteVoteRequiresAuthentication(): void
    {
        $document = DocumentFactory::createOne();
        $documentComment = DocumentCommentFactory::createOne();
        $courseComment = CourseCommentFactory::createOne();

        $this->browser()
            ->delete('/api/documents/' . $document->getId() . '/votes')
            ->assertStatus(401);

        $this->browser()
            ->delete('/api/document-comments/' . $documentComment->getId() . '/votes')
            ->assertStatus(401);

        $this->browser()
            ->delete('/api/course-comments/' . $courseComment->getId() . '/votes')
            ->assertStatus(401);
    }

    public function testVoteWorkflowIntegration(): void
    {
        $user = UserFactory::createOne(['plainPassword' => 'password']);
        $document = DocumentFactory::createOne();
        $token = $this->getToken($user->getUsername(), 'password');

        // Initial state - no votes
        $this->browser()
            ->get(
                '/api/documents/' . $document->getId() . '/votes',
                [
                'headers' => [
                    'Authorization' => 'Bearer ' . $token,
                    'Content-Type' => 'application/ld+json'
                ]
                ]
            )
            ->assertStatus(200)
            ->assertJsonMatches('sum', 0);

        // Create upvote
        $this->browser()
            ->post(
                '/api/documents/' . $document->getId() . '/votes',
                [
                'json' => ['voteType' => 1],
                'headers' => [
                    'Authorization' => 'Bearer ' . $token,
                    'Content-Type' => 'application/ld+json'
                ]
                ]
            )
            ->assertStatus(201);

        // Check vote summary
        $this->browser()
            ->get(
                '/api/documents/' . $document->getId() . '/votes',
                [
                'headers' => [
                    'Authorization' => 'Bearer ' . $token,
                    'Content-Type' => 'application/ld+json'
                ]
                ]
            )
            ->assertStatus(200)
            ->assertJsonMatches('upvotes', 1)
            ->assertJsonMatches('downvotes', 0)
            ->assertJsonMatches('sum', 1);

        // Change to downvote
        $this->browser()
            ->post(
                '/api/documents/' . $document->getId() . '/votes',
                [
                'json' => ['voteType' => -1],
                'headers' => [
                    'Authorization' => 'Bearer ' . $token,
                    'Content-Type' => 'application/ld+json'
                ]
                ]
            )
            ->assertStatus(200);

        // Check updated vote summary
        $this->browser()
            ->get(
                '/api/documents/' . $document->getId() . '/votes',
                [
                'headers' => [
                    'Authorization' => 'Bearer ' . $token,
                    'Content-Type' => 'application/ld+json'
                ]
                ]
            )
            ->assertStatus(200)
            ->assertJsonMatches('upvotes', 0)
            ->assertJsonMatches('downvotes', 1)
            ->assertJsonMatches('sum', -1);

        // Delete vote
        $this->browser()
            ->delete(
                '/api/documents/' . $document->getId() . '/votes',
                [
                'headers' => [
                    'Authorization' => 'Bearer ' . $token,
                    'Content-Type' => 'application/ld+json'
                ]
                ]
            )
            ->assertStatus(204);

        // Check final vote summary
        $this->browser()
            ->get(
                '/api/documents/' . $document->getId() . '/votes',
                [
                'headers' => [
                    'Authorization' => 'Bearer ' . $token,
                    'Content-Type' => 'application/ld+json'
                ]
                ]
            )
            ->assertStatus(200)
            ->assertJsonMatches('upvotes', 0)
            ->assertJsonMatches('downvotes', 0)
            ->assertJsonMatches('sum', 0);
    }
}
