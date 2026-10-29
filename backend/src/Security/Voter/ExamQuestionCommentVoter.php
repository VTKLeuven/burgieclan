<?php

namespace App\Security\Voter;

use App\ApiResource\ExamQuestionCommentApi;
use App\Entity\User;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Vote;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

/**
 * Only the author edits or deletes a comment on an exam question. Moderators remove comments in
 * the admin (ExamCrudController), not through the API.
 *
 * @extends Voter<string, ExamQuestionCommentApi>
 */
class ExamQuestionCommentVoter extends Voter
{
    public const EDIT = 'EDIT';
    public const DELETE = 'DELETE';

    protected function supports(string $attribute, mixed $subject): bool
    {
        return in_array($attribute, [self::EDIT, self::DELETE], true) && $subject instanceof ExamQuestionCommentApi;
    }

    protected function voteOnAttribute(
        string $attribute,
        mixed $subject,
        TokenInterface $token,
        ?Vote $vote = null
    ): bool {
        $user = $token->getUser();

        return $user instanceof User && null !== $subject->creatorId && $subject->creatorId === $user->getId();
    }
}
