<?php

declare(strict_types=1);

/*
 * This file is part of the Symfony package.
 *
 * (c) Fabien Potencier <fabien@symfony.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace App\Repository;

use App\Entity\User;
use App\OauthProvider\LitusResourceOwner;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use League\OAuth2\Client\Token\AccessToken;
use Symfony\Component\Security\Core\Exception\AuthenticationException;

/**
 * This custom Doctrine repository is empty because so far we don't need any custom
 * method to query for application user information. But it's always a good practice
 * to define a custom repository that will be used when the application grows.
 *
 * See https://symfony.com/doc/current/doctrine.html#querying-for-objects-the-repository
 *
 * @author Ryan Weaver <weaverryan@gmail.com>
 * @author Javier Eguiluz <javier.eguiluz@gmail.com>
 *
 * @method User|null findOneByUsername(string $username)
 * @method User|null findOneByEmail(string $email)
 *
 * @template-extends ServiceEntityRepository<User>
 */
class UserRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, User::class);
    }

    /**
     * @param LitusResourceOwner $litusUser
     * @param AccessToken        $accessToken
     *
     * @throws AuthenticationException
     *
     * @return User
     */
    public function createUserFromLitusUser(LitusResourceOwner $litusUser, AccessToken $accessToken): User
    {
        $user = $this->findOneBy(['username' => $litusUser->getUsername()]);
        if (null === $user) {
            $user = $this->findOneBy(['email' => $litusUser->getEmail()]);
            if ($user) {
                // Person trying to create an account has the same email as an existing user -> not allowed.
                throw new AuthenticationException();
            }

            $user = new User();
            $user->setUsername($litusUser->getUsername());
            $user->setEmail($litusUser->getEmail());
            $user->setFullName($litusUser->getFullName());
            $user->setPassword('');
            $user->setRoles([User::ROLE_USER]);

            $this->getEntityManager()->persist($user);
        }

        $user->setAccessToken($accessToken);

        $this->getEntityManager()->flush();

        return $user;
    }
}
