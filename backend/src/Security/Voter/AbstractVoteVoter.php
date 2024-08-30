<?php

namespace App\Security\Voter;

use App\ApiResource\AbstractVoteApi;
use App\Entity\User;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfonycasts\MicroMapper\MicroMapperInterface;

class AbstractVoteVoter extends Voter
{
    public const EDIT = 'EDIT';
    public const DELETE = 'DELETE';

    public function __construct(
        private readonly MicroMapperInterface $microMapper,
    ) {
    }

    protected function supports(string $attribute, mixed $subject): bool
    {
        return in_array($attribute, [self::EDIT, self::DELETE]) && $subject instanceof AbstractVoteApi;
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token): bool
    {
        $user = $token->getUser();
        if (!$user instanceof UserInterface) {
            return false;
        }

        assert($subject instanceof AbstractVoteApi);

        $creator = $this->microMapper->map($subject->creator, User::class, [
            MicroMapperInterface::MAX_DEPTH => 0,
        ]);

        switch ($attribute) {
            case self::EDIT:
            case self::DELETE:
                return $creator === $user;
        }

        return false;
    }
}
