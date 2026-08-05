<?php

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
use App\OauthProvider\FluxusResourceOwner;
use App\Service\FluxusRoleSynchronizer;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use League\OAuth2\Client\Token\AccessToken;
use Psr\Log\LoggerInterface;
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
    public function __construct(
        ManagerRegistry $registry,
        private readonly FluxusRoleSynchronizer $roleSynchronizer,
        // TEMPORARY (SSO-DIAG): only used by the diagnostic logging below. Remove
        // this argument together with it.
        private readonly LoggerInterface $logger
    ) {
        parent::__construct($registry, User::class);
    }

    /**
     * Find or create the Burgieclan account behind a VTK SSO login.
     *
     * Matching order matters. `sub` is stable and survives a member changing their
     * email address, so it wins. Email is the fallback that links accounts created
     * back when Burgieclan still logged in through Litus: those have no `sub` yet
     * and would otherwise turn into duplicates, taking their favourites and uploads
     * with them. Once linked, the `sub` path takes over for good.
     *
     * @param FluxusResourceOwner $fluxusUser
     * @param AccessToken $accessToken
     * @return User
     * @throws AuthenticationException
     */
    public function createUserFromFluxusUser(FluxusResourceOwner $fluxusUser, AccessToken $accessToken): User
    {
        $sub = $fluxusUser->getId();
        $email = $fluxusUser->getEmail();

        if (null === $sub || null === $email) {
            // Without a subject or an email there is nothing to key an account on.
            throw new AuthenticationException('VTK userinfo is missing sub or email.');
        }

        // TEMPORARY (SSO-DIAG): how the account was reached, for the log below.
        $matchedBy = 'sub';

        $user = $this->findOneBy(["fluxusSub" => $sub]);

        if (null === $user) {
            $user = $this->findOneBy(["email" => $email]);

            if (null !== $user) {
                // Pre-existing account, first login through VTK: link it once.
                $user->setFluxusSub($sub);
                $matchedBy = 'email';
            } else {
                $matchedBy = 'created';
                $user = new User();
                $user->setFluxusSub($sub);
                $user->setEmail($email);
                $user->setUsername($this->generateUsername($fluxusUser, $email));
                $user->setFullName($fluxusUser->getFullName() ?? $email);
                // No local password: this account signs in through VTK. The password
                // login stays available for accounts that were given one on purpose.
                $user->setPassword('');
                $user->setRoles([User::ROLE_USER]);

                $this->getEntityManager()->persist($user);
            }
        }

        $rolesBefore = $user->getSsoRoles();

        $this->roleSynchronizer->synchronize($user, $fluxusUser);

        $user->setAccessToken($accessToken);

        $this->getEntityManager()->flush();

        // ---------------------------------------------------------------------
        // TEMPORARY (SSO-DIAG): remove once the missing-admin question is settled.
        //
        // Logged at error level on purpose: in prod monolog buffers behind
        // fingers_crossed with action_level: error, so anything lower is dropped
        // unless the request happens to fail as well.
        //
        // The raw claims contain personal data (name, address, student number).
        // That is the point — it is what we are trying to see — but it is also why
        // this must not outlive the diagnosis or reach production.
        // ---------------------------------------------------------------------
        $this->logger->error(
            '[SSO-DIAG] VTK login resolved',
            [
                'matched_by' => $matchedBy,
                'sub' => $sub,
                'email' => $email,
                'username' => $user->getUsername(),
                // The distinction that decides everything: absent means VTK never
                // answered and synchronize() left the roles alone; an empty list
                // means it answered "none" and did clear them.
                'has_permissions_claim' => $fluxusUser->hasPermissionsClaim(),
                'permissions' => $fluxusUser->getPermissions(),
                'sso_roles_before' => $rolesBefore,
                'sso_roles_after' => $user->getSsoRoles(),
                'local_roles' => $user->getLocalRoles(),
                'effective_roles' => $user->getRoles(),
                // Everything UserInfo returned, so a missing `permissions` key can
                // be told apart from a claim that arrived empty.
                'raw_claims' => $fluxusUser->toArray(),
                'granted_scopes' => $accessToken->getValues()['scope'] ?? '(no scope in token response)',
            ]
        );

        return $user;
    }

    /**
     * VTK issues no username, but the column is unique and NOT NULL, so derive one
     * and add a numeric suffix on a collision. Only used when creating an account;
     * existing usernames never change.
     *
     * The r-number first: it is the identifier members recognise, and it is stable
     * where the local part of an address is not. It is not guaranteed to arrive
     * though — `vtk:student_number` is a sensitive scope the member can refuse on
     * VTK's consent screen, and not every member has one on file — so the address
     * stays as the fallback rather than the login failing over a refused scope.
     */
    private function generateUsername(FluxusResourceOwner $fluxusUser, string $email): string
    {
        $base = $fluxusUser->getStudentNumber() ?? (strstr($email, '@', true) ?: $email);
        // The column allows 50 characters and at least 2; leave room for a suffix.
        $base = substr(preg_replace('/[^a-zA-Z0-9._-]/', '', $base) ?? '', 0, 40);

        if (strlen($base) < 2) {
            $base = 'vtk' . $base;
        }

        $candidate = $base;
        $suffix = 1;

        while (null !== $this->findOneBy(["username" => $candidate])) {
            $candidate = $base . $suffix;
            $suffix++;
        }

        return $candidate;
    }
}
