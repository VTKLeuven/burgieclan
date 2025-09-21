<?php

namespace Api;

use App\Entity\CourseCommentVote;
use App\Factory\CourseCommentFactory;
use App\Factory\CourseCommentVoteFactory;
use App\Factory\UserFactory;
use App\Tests\Api\ApiTestCase;
use Zenstruck\Foundry\Test\Factories;
use Zenstruck\Foundry\Test\ResetDatabase;

class CourseCommentVoteResourceTest extends ApiTestCase
{
    use ResetDatabase;
    use Factories;

    public function testGetCollectionOfCourseCommentVotes(): void
    {
        $courseComments = CourseCommentFactory::createMany(5);
        foreach ($courseComments as $comment) {
            CourseCommentVoteFactory::createOne(['courseComment' => $comment]);
        }

        $json = $this->browser()
            ->get('/api/course_comment_votes', [
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
            'courseComment',
            'creator',
            'createdAt',
            'updatedAt',
        ], array_keys($json->decoded()['hydra:member'][0]));
    }

    public function testGetOneCourseCommentVote(): void
    {
        $commentVote = CourseCommentVoteFactory::createOne();

        $this->browser()
            ->get('/api/course_comment_votes/' . $commentVote->getId(), [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"@id"', '/api/course_comment_votes/' . $commentVote->getId());
    }

    public function testGetCourseCommentVoteFilterByVoteType(): void
    {
        $comments = CourseCommentFactory::createMany(3);
        $commentVote1 = CourseCommentVoteFactory::createOne(['voteType' => CourseCommentVote::UPVOTE, 'courseComment' => $comments[0]]);
        $commentVote2 = CourseCommentVoteFactory::createOne(['voteType' => CourseCommentVote::DOWNVOTE, 'courseComment' => $comments[1]]);
        $commentVote3 = CourseCommentVoteFactory::createOne(['voteType' => CourseCommentVote::UPVOTE, 'courseComment' => $comments[2]]);

        $this->browser()
            ->get('/api/course_comment_votes?voteType=1', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 2)
            ->assertJsonMatches('length("hydra:member")', 2);

        $this->browser()
            ->get('/api/course_comment_votes?voteType=-1', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1);
    }

    public function testGetCourseCommentVoteFilterByCreator(): void
    {
        $user1 = UserFactory::createOne();
        $user2 = UserFactory::createOne();
        $courseComments = CourseCommentFactory::createMany(2);
        CourseCommentVoteFactory::createOne(['creator' => $user1, 'courseComment' => $courseComments[0]]);
        CourseCommentVoteFactory::createOne(['creator' => $user2, 'courseComment' => $courseComments[0]]);
        CourseCommentVoteFactory::createOne(['creator' => $user2, 'courseComment' => $courseComments[1]]);

        $this->browser()
            ->get('/api/course_comment_votes?creator=/api/users/' . $user1->getId(), [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 1)
            ->assertJsonMatches('length("hydra:member")', 1)
            ->get('/api/course_comment_votes?creator[]=/api/users/' . $user1->getId() .
                '&creator[]=/api/users/' . $user2->getId(), [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3)
            ->get('/api/course_comment_votes', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token
                ]
            ])
            ->assertStatus(200)
            ->assertJson()
            ->assertJsonMatches('"hydra:totalItems"', 3)
            ->assertJsonMatches('length("hydra:member")', 3);
    }

    public function testPostToCreateCourseCommentVote(): void
    {
        $user = UserFactory::createOne(['plainPassword' => 'password']);
        $courseComment = CourseCommentFactory::createOne();

        $this->browser()
            ->post('/api/course_comment_votes', [
                'json' => [],
                'headers' => [
                    'Content-Type' => 'application/ld+json',
                    'Authorization' => 'Bearer ' . $this->getToken($user->getUsername(), 'password')
                ],
            ])
            ->assertStatus(422)
            ->post('/api/course_comment_votes', [
                'json' => [
                    'voteType' => 1,
                    'courseComment' => '/api/course_comments/' . $courseComment->getId(),
                ],
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->getToken($user->getUsername(), 'password')
                ]
            ])
            ->assertStatus(201)
            ->assertJsonMatches('voteType', 1);
    }

    public function testPatchToUpdateCourseCommentVote(): void
    {
        $creator = UserFactory::createOne(['username' => 'creator', 'plainPassword' => 'password']);
        $otherUser = UserFactory::createOne(['username' => 'other_user', 'plainPassword' => 'password']);

        $creatorToken = $this->getToken($creator->getUsername(), 'password');
        $otherUserToken = $this->getToken($otherUser->getUsername(), 'password');

        $courseComment = CourseCommentFactory::createOne();
        $commentVote = CourseCommentVoteFactory::createOne(['creator' => $creator, 'courseComment' => $courseComment]);

        $this->browser()
            ->patch('/api/course_comment_votes/' . $commentVote->getId(), [
                'json' => ['courseComment' => '/api/course_comments/' . $courseComment->getId()],
                'headers' => [
                    'Content-Type' => 'application/merge-patch+json',
                    'Authorization' => 'Bearer ' . $creatorToken
                ]
            ])
            ->assertStatus(200)
            ->assertJsonMatches('courseComment', '/api/course_comments/' . $courseComment->getId());

        $this->browser()
            ->patch('/api/course_comment_votes/' . $commentVote->getId(), [
                'json' => ['courseComment' => '/api/course_comments/' . $courseComment->getId()],
                'headers' => [
                    'Content-Type' => 'application/merge-patch+json',
                    'Authorization' => 'Bearer ' . $otherUserToken
                ]
            ])
            ->assertStatus(403);
    }

    public function testDeleteCourseCommentVote(): void
    {
        $creator = UserFactory::createOne(['username' => 'creator', 'plainPassword' => 'password']);
        $otherUser = UserFactory::createOne(['username' => 'other_user', 'plainPassword' => 'password']);

        $creatorToken = $this->getToken($creator->getUsername(), 'password');
        $otherToken = $this->getToken($otherUser->getUsername(), 'password');

        $commentVote = CourseCommentVoteFactory::createOne(['creator' => $creator]);
        $commentVoteId = $commentVote->getId();

        $this->browser()
            ->get('/api/course_comment_votes/' . $commentVoteId, [
                'headers' => [
                    'Authorization' => 'Bearer ' . $creatorToken
                ]
            ])
            ->assertStatus(200);

        $this->browser()
            ->delete('/api/course_comment_votes/' . $commentVoteId, [
                'headers' => [
                    'Authorization' => 'Bearer ' . $otherToken
                ]
            ])
            ->assertStatus(403);

        $this->browser()
            ->delete('/api/course_comment_votes/' . $commentVoteId, [
                'headers' => [
                    'Authorization' => 'Bearer ' . $creatorToken
                ]
            ])
            ->assertStatus(204);

        $this->browser()
            ->get('/api/course_comment_votes/' . $commentVoteId, [
                'headers' => [
                    'Authorization' => 'Bearer ' . $creatorToken
                ]
            ])
            ->assertStatus(404);
    }
}