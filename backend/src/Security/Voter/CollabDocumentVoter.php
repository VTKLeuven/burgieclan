<?php

namespace App\Security\Voter;

use App\Entity\CollabDocument;
use App\Entity\User;
use App\Repository\ExamRepository;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\AccessDecisionManagerInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Vote;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

/**
 * Who may open a live document, and whether they may change it.
 *
 * The subject is the document name (see CollabDocument::NAME_PATTERN). The collab server never
 * decides this itself: Symfony decides when it issues the collab token, and the token carries the
 * outcome.
 *
 * - "exam-{id}", an exam reconstruction: every logged-in user may view it, and edit it until its
 *   `editableUntil`. After that it is read-only until a moderator reopens it.
 * - "collab-test", the phase 0 test page: moderators only.
 *
 * Any other name is denied.
 *
 * @extends Voter<string, string>
 */
class CollabDocumentVoter extends Voter
{
    public const EDIT = 'COLLAB_EDIT';
    public const VIEW = 'COLLAB_VIEW';

    public const TEST_DOCUMENT = 'collab-test';

    public function __construct(
        private readonly AccessDecisionManagerInterface $accessDecisionManager,
        private readonly ExamRepository $exams,
    ) {}

    protected function supports(string $attribute, mixed $subject): bool
    {
        return in_array($attribute, [self::EDIT, self::VIEW], true)
            && is_string($subject)
            && CollabDocument::isValidName($subject);
    }

    protected function voteOnAttribute(
        string $attribute,
        mixed $subject,
        TokenInterface $token,
        ?Vote $vote = null
    ): bool {
        if (!$token->getUser() instanceof User) {
            return false;
        }

        if (self::TEST_DOCUMENT === $subject) {
            // Goes through the decision manager rather than reading getRoles(), so the role
            // hierarchy applies: an admin counts as a moderator.
            return $this->accessDecisionManager->decide($token, [User::ROLE_MODERATOR]);
        }

        $exam = $this->exams->findByDocumentName($subject);
        if (null === $exam) {
            return false;
        }

        return self::VIEW === $attribute || $exam->isEditable();
    }
}
