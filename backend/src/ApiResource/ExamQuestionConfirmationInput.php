<?php

namespace App\ApiResource;

use App\Entity\ExamQuestion;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * Body of POST /api/exams/{id}/confirmations: whether you had this question too. Setting it
 * twice to the same value changes nothing.
 */
class ExamQuestionConfirmationInput
{
    /** The question's permanent id in the editor (the examQuestion node's `id`). */
    #[Assert\NotBlank]
    #[Assert\Length(max: ExamQuestion::MAX_UID_LENGTH)]
    #[Assert\Regex(pattern: '/^[A-Za-z0-9_-]+$/', message: 'Not a question id.')]
    public ?string $questionUid = null;

    #[Assert\NotNull]
    public ?bool $confirmed = null;
}
