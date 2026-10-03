<?php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Doctrine\Orm\State\Options;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Constants\SerializationGroups;
use App\Entity\ExamQuestion;
use App\Entity\ExamQuestionComment;
use App\State\EntityClassDtoStateProvider;
use App\State\ExamQuestionCommentProcessor;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * A comment on one question of an exam reconstruction (App\Entity\ExamQuestionComment).
 *
 * A question is named by its exam and its `questionUid`, the permanent id the editor gives it:
 * the page knows those, while the question's row may not exist yet when someone comments on a
 * question they added seconds ago (ExamQuestionRepository::findOrCreate).
 *
 * The author is never exposed, only `authorName`: their full name, or for an anonymous comment
 * the same per-exam pseudonym as their cursor. `mine` says whether the viewer may edit it.
 *
 * List a thread with
 * GET /api/exam_question_comments?question.exam={examId}&question.uid={uid}&pagination=false.
 */
#[ApiResource(
    shortName: 'ExamQuestionComment',
    operations: [
        new Get(),
        new GetCollection(),
        new Post(
            denormalizationContext: ['groups' => [SerializationGroups::EXAM_QUESTION_COMMENT_CREATE]],
            validationContext: ['groups' => ['Default', 'create']],
        ),
        new Patch(
            denormalizationContext: ['groups' => [SerializationGroups::EXAM_QUESTION_COMMENT_EDIT]],
            security: 'is_granted("EDIT", object)',
        ),
        new Delete(security: 'is_granted("DELETE", object)'),
    ],
    normalizationContext: [
        'groups' => [SerializationGroups::BASE_READ, SerializationGroups::EXAM_QUESTION_COMMENT_GET],
    ],
    order: ['createdAt' => 'ASC', 'id' => 'ASC'],
    provider: EntityClassDtoStateProvider::class,
    processor: ExamQuestionCommentProcessor::class,
    stateOptions: new Options(entityClass: ExamQuestionComment::class),
)]
#[ApiFilter(SearchFilter::class, properties: ['question.exam' => 'exact', 'question.uid' => 'exact'])]
class ExamQuestionCommentApi extends BaseEntityApi
{
    #[Assert\NotNull(groups: ['create'])]
    #[Groups([SerializationGroups::EXAM_QUESTION_COMMENT_GET, SerializationGroups::EXAM_QUESTION_COMMENT_CREATE])]
    public ?ExamApi $exam = null;

    /** The question's permanent id in the editor (the examQuestion node's `id`). */
    #[Assert\NotBlank(groups: ['create'])]
    #[Assert\Length(max: ExamQuestion::MAX_UID_LENGTH)]
    #[Assert\Regex(pattern: '/^[A-Za-z0-9_-]+$/', message: 'Not a question id.')]
    #[Groups([SerializationGroups::EXAM_QUESTION_COMMENT_GET, SerializationGroups::EXAM_QUESTION_COMMENT_CREATE])]
    public ?string $questionUid = null;

    /** Plain text; render it as text, never as HTML. */
    #[Assert\NotBlank(normalizer: 'trim')]
    #[Assert\Length(max: ExamQuestionComment::MAX_LENGTH)]
    #[Groups(
        [
            SerializationGroups::EXAM_QUESTION_COMMENT_GET,
            SerializationGroups::EXAM_QUESTION_COMMENT_CREATE,
            SerializationGroups::EXAM_QUESTION_COMMENT_EDIT,
        ]
    )]
    public ?string $content = null;

    /** The author's full name, or their pseudonym for this exam when the comment is anonymous. */
    #[ApiProperty(writable: false)]
    #[Groups([SerializationGroups::EXAM_QUESTION_COMMENT_GET])]
    public ?string $authorName = null;

    #[ApiProperty(writable: false)]
    #[Groups([SerializationGroups::EXAM_QUESTION_COMMENT_GET])]
    public bool $anonymous = false;

    /** Written by whoever is asking, who may edit and delete it. */
    #[ApiProperty(writable: false)]
    #[Groups([SerializationGroups::EXAM_QUESTION_COMMENT_GET])]
    public bool $mine = false;

    /** For ExamQuestionCommentVoter; never serialized, so anonymous authors stay anonymous. */
    #[ApiProperty(readable: false, writable: false)]
    public ?int $creatorId = null;
}
