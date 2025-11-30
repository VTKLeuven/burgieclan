<?php

namespace App\Security\Voter;

use App\ApiResource\UserApi;
use App\Entity\User;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfonycasts\MicroMapper\MicroMapperInterface;

class UserVoter extends Voter
{
    const ROLES = [
        'VIEW_OWN_USER_DATA' => 'VIEW_OWN_USER_DATA',
    ];

    public function __construct(
        private readonly MicroMapperInterface $microMapper,
    ) {
    }


    protected function supports(string $attribute, mixed $subject): bool
    {
        // replace with your own logic
        // https://symfony.com/doc/current/security/voters.html
        return in_array($attribute, self::ROLES)
            && $subject instanceof UserApi;
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token): bool
    {
        $currentUser = $token->getUser();
        // if the user is unauthenticated, do not grant access
        if (!$currentUser instanceof UserInterface) {
            return false;
        }

        assert($subject instanceof UserApi);
        // ... (check conditions and return true to grant permission) ...
        switch ($attribute) {
            case self::ROLES['VIEW_OWN_USER_DATA']:
                // True if the current user is the same as the requested user
                $requestedUser = $this->microMapper->map(
                    $subject,
                    User::class,
                    [
                        MicroMapperInterface::MAX_DEPTH => 0,
                    ]
                );

                if ($requestedUser == $currentUser) {
                    return true;
                }
                break;
        }

        return false;
    }
}
