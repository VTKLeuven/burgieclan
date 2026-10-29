<?php

namespace App\Entity;

use App\Repository\ExamQuestionCommentRepository;
use Doctrine\ORM\Mapping as ORM;

/**
 * A comment on one question of an exam reconstruction: one flat thread per question, below it.
 *
 * Anonymous follows the author's `defaultAnonymous` setting when the comment is written. An
 * anonymous comment shows the same per-exam pseudonym as the author's cursor in the editor
 * ("Anonieme Pinguïn", CollabDisplayName), so a remark can be tied to whoever wrote the question
 * without naming them. Moderators see the real author in the admin.
 *
 * Comments stay open after the reconstruction locks: the lock protects the questions, while
 * discussing the answers stays useful long after the exam.
 */
#[ORM\Entity(repositoryClass: ExamQuestionCommentRepository::class)]
#[ORM\Index(name: 'idx_exam_question_comment_question_created', columns: ['question_id', 'created_at'])]
class ExamQuestionComment extends AbstractComment
{
    public const MAX_LENGTH = 2000;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ExamQuestion $question;

    public function __construct(User $creator, ExamQuestion $question)
    {
        parent::__construct($creator);
        $this->question = $question;
    }

    public function getQuestion(): ExamQuestion
    {
        return $this->question;
    }
}
