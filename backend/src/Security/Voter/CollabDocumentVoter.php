<?php

namespace App\Security\Voter;

use App\Entity\CollabDocument;
use App\Entity\User;
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
 * Phase 0 knows a single document, the "collab-test" page, open to moderators only. Exam
 * documents ("exam-{id}") are added in phase 1.
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

        return false;
    }
}
