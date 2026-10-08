<?php

namespace App\Security\Voter;

use App\Entity\Document;
use App\Entity\User;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\AccessDecisionManagerInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Vote;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

/**
 * Decides who may open a document's file.
 *
 * Approved documents are readable by every logged-in user. A document still waiting
 * on moderation is only readable by its uploader and by moderators, matching the
 * document lists (see DocumentUnderReviewExtension), which already hide it from
 * everyone else.
 *
 * @extends Voter<string, Document>
 */
class DocumentFileVoter extends Voter
{
    public const VIEW_FILE = 'DOCUMENT_VIEW_FILE';

    public function __construct(
        private readonly AccessDecisionManagerInterface $accessDecisionManager,
    ) {
    }

    protected function supports(string $attribute, mixed $subject): bool
    {
        return self::VIEW_FILE === $attribute && $subject instanceof Document;
    }

    protected function voteOnAttribute(
        string $attribute,
        mixed $subject,
        TokenInterface $token,
        ?Vote $vote = null
    ): bool {
        $user = $token->getUser();
        if (!$user instanceof User) {
            return false;
        }

        if (!$subject->isUnderReview()) {
            return true;
        }

        if ($subject->getCreator()->getId() === $user->getId()) {
            return true;
        }

        return $this->accessDecisionManager->decide($token, [User::ROLE_MODERATOR]);
    }
}
