<?php

namespace App\Tests\Service;

use App\Entity\User;
use App\OauthProvider\FluxusResourceOwner;
use App\Service\FluxusRoleSynchronizer;
use PHPUnit\Framework\TestCase;

class FluxusRoleSynchronizerTest extends TestCase
{
    private FluxusRoleSynchronizer $synchronizer;

    protected function setUp(): void
    {
        $this->synchronizer = new FluxusRoleSynchronizer();
    }

    public function testMapsKnownPermissionsToRoles(): void
    {
        $roles = $this->synchronizer->mapPermissions(['burgieclan.moderate', 'burgieclan.admin']);

        $this->assertEqualsCanonicalizing([User::ROLE_MODERATOR, User::ROLE_ADMIN], $roles);
    }

    public function testIgnoresUnknownPermissions(): void
    {
        // VTK must be able to add codes to our namespace without breaking logins.
        $roles = $this->synchronizer->mapPermissions(
            [
            'burgieclan.moderate',
            'burgieclan.something-we-do-not-know-yet',
            'wiki.read',
            ]
        );

        $this->assertSame([User::ROLE_MODERATOR], $roles);
    }

    public function testNeverGrantsSuperAdmin(): void
    {
        // The highest privilege stays local; no VTK code may hand it out.
        $roles = $this->synchronizer->mapPermissions(
            [
            'burgieclan.super-admin',
            'burgieclan.admin',
            ]
        );

        $this->assertNotContains(User::ROLE_SUPER_ADMIN, $roles);
    }

    public function testSynchronizeWritesRolesFromPermissionsClaim(): void
    {
        $user = new User();
        $fluxusUser = new FluxusResourceOwner(['permissions' => ['burgieclan.moderate']]);

        $this->synchronizer->synchronize($user, $fluxusUser);

        $this->assertSame([User::ROLE_MODERATOR], $user->getSsoRoles());
    }

    public function testSynchronizeClearsRolesOnEmptyClaim(): void
    {
        // An empty list that actually arrived is a real answer: no permissions.
        $user = new User();
        $user->setSsoRoles([User::ROLE_MODERATOR]);
        $fluxusUser = new FluxusResourceOwner(['permissions' => []]);

        $this->synchronizer->synchronize($user, $fluxusUser);

        $this->assertSame([], $user->getSsoRoles());
    }

    public function testSynchronizeKeepsRolesWhenClaimIsAbsent(): void
    {
        // The point of persisting ssoRoles: a failed userinfo call, or a client that
        // lost the `entitlements` scope, must not cost a moderator their rights.
        $user = new User();
        $user->setSsoRoles([User::ROLE_MODERATOR]);
        $fluxusUser = new FluxusResourceOwner(['sub' => 'abc', 'email' => 'a@b.c']);

        $this->synchronizer->synchronize($user, $fluxusUser);

        $this->assertSame([User::ROLE_MODERATOR], $user->getSsoRoles());
    }

    public function testEffectiveRolesAreTheUnionOfLocalAndSso(): void
    {
        $user = new User();
        $user->setRoles([User::ROLE_USER, User::ROLE_SUPER_ADMIN]);
        $user->setSsoRoles([User::ROLE_MODERATOR]);

        $this->assertEqualsCanonicalizing(
            [User::ROLE_USER, User::ROLE_SUPER_ADMIN, User::ROLE_MODERATOR],
            $user->getRoles()
        );
    }

    public function testSsoRolesNeverRemoveLocalRoles(): void
    {
        $user = new User();
        $user->setRoles([User::ROLE_ADMIN]);
        $user->setSsoRoles([]);

        $this->assertContains(User::ROLE_ADMIN, $user->getRoles());
    }
}
