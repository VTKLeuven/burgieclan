<?php

/*
 * This file is part of the Symfony package.
 *
 * (c) Fabien Potencier <fabien@symfony.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace App\Security\Voter;

use App\ApiResource\AbstractCommentApi;
use App\Entity\User;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfonycasts\MicroMapper\MicroMapperInterface;

class AbstractCommentVoter extends Voter
{
    public const EDIT = 'EDIT';
    public const DELETE = 'DELETE';

    public function __construct(
        private readonly MicroMapperInterface $microMapper,
    ) {
    }


    protected function supports(string $attribute, mixed $subject): bool
    {
        // replace with your own logic
        // https://symfony.com/doc/current/security/voters.html
        return in_array($attribute, [self::EDIT, self::DELETE]) && $subject instanceof AbstractCommentApi;
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token): bool
    {
        $user = $token->getUser();
        // if the user is unauthenticated, do not grant access
        if (!$user instanceof UserInterface) {
            return false;
        }

        assert($subject instanceof AbstractCommentApi);
        // ... (check conditions and return true to grant permission) ...
        switch ($attribute) {
            case self::EDIT:
                // logic to determine if the user can EDIT
                // return true or false
                $creator = $this->microMapper->map($subject->creator, User::class, [
                    MicroMapperInterface::MAX_DEPTH => 0,
                ]);

                if ($creator == $user) {
                    return true;
                }
                break;
            case self::DELETE:
                // logic to determine if the user can DELETE
                // return true or false
                $creator = $this->microMapper->map($subject->creator, User::class, [
                    MicroMapperInterface::MAX_DEPTH => 0,
                ]);

                if ($creator == $user) {
                    return true;
                }
                break;
        }

        return false;
    }
}
