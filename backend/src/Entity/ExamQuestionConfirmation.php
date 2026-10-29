<?php

namespace App\Entity;

use App\Repository\ExamQuestionConfirmationRepository;
use Doctrine\ORM\Mapping as ORM;

/**
 * "Ik had deze ook": someone confirms they got this question on their exam too.
 *
 * At most one per user per question, shown only as a count. There is deliberately no downvote: a
 * question that is wrong gets fixed by editing it. Like comments, confirmations stay open after
 * the reconstruction locks.
 */
#[ORM\Entity(repositoryClass: ExamQuestionConfirmationRepository::class)]
#[ORM\UniqueConstraint(
    name: 'uniq_exam_question_confirmation_creator_question',
    columns: ['creator_id', 'question_id']
)]
class ExamQuestionConfirmation extends Node
{
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
