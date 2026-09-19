<?php

namespace App\Security\Voter;

use App\ApiResource\DocumentApi;
use App\Entity\User;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Vote;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;
use Symfonycasts\MicroMapper\MicroMapperInterface;

/**
 * Lets an uploader withdraw an upload that is still waiting on moderation.
 *
 * Deliberately limited to documents with `under_review = true`: once a moderator has
 * approved one it is part of the archive, and other users can by then have favourited,
 * commented on or voted on it - all of which the database cascades away with the row.
 * Removing an approved document stays a moderator action through /admin.
 */
class DocumentVoter extends Voter
{
    public const DELETE = 'DELETE';

    public function __construct(
        private readonly MicroMapperInterface $microMapper,
    ) {}

    protected function supports(string $attribute, mixed $subject): bool
    {
        return self::DELETE === $attribute && $subject instanceof DocumentApi;
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

        assert($subject instanceof DocumentApi);

        if (!$subject->under_review) {
            return false;
        }

        if (!isset($subject->creator)) {
            return false;
        }

        $creator = $this->microMapper->map(
            $subject->creator,
            User::class,
            [
                MicroMapperInterface::MAX_DEPTH => 0,
            ]
        );

        return $creator->getId() === $user->getId();
    }
}
