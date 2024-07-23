<?php

namespace App\Security\Voter;

use App\ApiResource\PageApi;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;
use Symfony\Component\Security\Core\User\UserInterface;

class PageVoter extends Voter
{
    public const VIEW = 'VIEW';     // get page name, content and url key

    protected function supports(string $attribute, $subject): bool
    {
        return in_array($attribute, [self::VIEW]) && ($subject instanceof PageApi);
    }

    protected function voteOnAttribute(string $attribute, $subject, TokenInterface $token): bool
    {
        if ($subject instanceof PageApi) {
            // if page is public available, unauthenticated users can access page
            if ($subject->publicAvailable) {
                return true;
            }

            $currentUser = $token->getUser();
            // if page is not public available, only authenticated users can access page
            if (!$currentUser instanceof UserInterface) {
                return false;
            }

            return true;
        }

        return false;
    }
}
