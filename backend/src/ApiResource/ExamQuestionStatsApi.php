<?php

namespace App\ApiResource;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\Post;
use App\Constants\SerializationGroups;
use App\State\ExamQuestionConfirmationProcessor;
use App\State\ExamQuestionStatsProvider;
use Symfony\Component\Serializer\Attribute\Groups;

/**
 * Per question of an exam reconstruction: how many comments it has, how many people said they had
 * it too, and whether you did. Loaded with the exam page, and again whenever the collab server
 * says something changed (ExamQuestionActivity).
 *
 * POST /api/exams/{id}/confirmations with {"questionUid", "confirmed"} sets "Ik had deze ook"
 * for you and answers with the new counts. Like comments, it stays open after a lock.
 */
#[ApiResource(
    shortName: 'ExamQuestionStats',
    operations: [
        new Get(
            uriTemplate: '/exams/{id}/question_stats',
            provider: ExamQuestionStatsProvider::class,
        ),
        new Post(
            uriTemplate: '/exams/{id}/confirmations',
            status: 200,
            input: ExamQuestionConfirmationInput::class,
            read: false,
            processor: ExamQuestionConfirmationProcessor::class,
        ),
    ],
    normalizationContext: ['groups' => [SerializationGroups::EXAM_QUESTION_STATS_GET]],
)]
class ExamQuestionStatsApi
{
    /** The exam's id. */
    #[ApiProperty(identifier: true)]
    public ?int $id = null;

    /**
     * Only questions with comments or confirmations, as
     * [{"uid", "comments", "confirmations", "confirmed"}].
     *
     * @var list<array{uid: string, comments: int, confirmations: int, confirmed: bool}>
     */
    #[Groups([SerializationGroups::EXAM_QUESTION_STATS_GET])]
    public array $questions = [];
}
