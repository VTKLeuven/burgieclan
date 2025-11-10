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
    public const VIEW_USERNAME = 'VIEW_USERNAME';
    public const VIEW_EMAIL = 'VIEW_EMAIL';
    public const VIEW_FAVORITES = 'VIEW_FAVORITES';
    public const VIEW_USER_DEFAULT_ANONYMOUS = 'VIEW_USER_DEFAULT_ANONYMOUS';
    public const PATCH_USER = 'PATCH_USER';
    public const VIEW_VOTES = 'VIEW_VOTES';

    public function __construct(
        private readonly MicroMapperInterface $microMapper,
    ) {
    }


    protected function supports(string $attribute, mixed $subject): bool
    {
        // replace with your own logic
        // https://symfony.com/doc/current/security/voters.html
        return in_array(
            $attribute,
            [
                self::VIEW_USERNAME,
                self::VIEW_EMAIL,
                self::VIEW_FAVORITES,
                self::VIEW_USER_DEFAULT_ANONYMOUS,
                self::PATCH_USER,
                self::VIEW_VOTES,
            ]
        )
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
            case self::PATCH_USER:
            case self::VIEW_USER_DEFAULT_ANONYMOUS:
            case self::VIEW_FAVORITES:
            case self::VIEW_VOTES:
            case self::VIEW_EMAIL:
            case self::VIEW_USERNAME:
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
