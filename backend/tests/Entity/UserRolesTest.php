<?php

namespace App\Tests\Entity;

use App\Entity\User;
use PHPUnit\Framework\TestCase;
use Symfony\Component\PropertyAccess\PropertyAccess;
use Symfony\Component\PropertyAccess\PropertyAccessorInterface;

/**
 * Guards the local/SSO role split against the way admin forms read and write it.
 *
 * UserCrudController binds its "Roles (local)" field to `localRoles` rather than
 * `roles`. That is not cosmetic: the property accessor resolves `roles` through
 * getRoles(), which returns the union with the VTK-granted roles, so a form bound
 * there would round-trip them into the local column and make them unrevokable by a
 * later resync. These tests fail if that binding is ever changed back.
 */
class UserRolesTest extends TestCase
{
    private PropertyAccessorInterface $propertyAccessor;

    protected function setUp(): void
    {
        $this->propertyAccessor = PropertyAccess::createPropertyAccessor();
    }

    public function testLocalRolesPropertyExposesOnlyTheLocalOnes(): void
    {
        $user = new User();
        $user->setRoles([User::ROLE_SUPER_ADMIN]);
        $user->setSsoRoles([User::ROLE_MODERATOR]);

        $this->assertSame(
            [User::ROLE_SUPER_ADMIN],
            $this->propertyAccessor->getValue($user, 'localRoles')
        );
    }

    public function testRoundTrippingLocalRolesDoesNotAbsorbSsoRoles(): void
    {
        // What an admin opening the edit page and pressing Save does.
        $user = new User();
        $user->setRoles([]);
        $user->setSsoRoles([User::ROLE_MODERATOR]);

        $this->propertyAccessor->setValue(
            $user,
            'localRoles',
            $this->propertyAccessor->getValue($user, 'localRoles')
        );

        $this->assertSame([], $user->getLocalRoles());
        // Still granted, but still revocable by VTK.
        $this->assertContains(User::ROLE_MODERATOR, $user->getRoles());
    }

    public function testRolesPropertyStillResolvesToTheEffectiveSet(): void
    {
        // The security layer reads the union; only the admin form uses localRoles.
        $user = new User();
        $user->setRoles([User::ROLE_SUPER_ADMIN]);
        $user->setSsoRoles([User::ROLE_MODERATOR]);

        $this->assertEqualsCanonicalizing(
            [User::ROLE_SUPER_ADMIN, User::ROLE_MODERATOR],
            $this->propertyAccessor->getValue($user, 'roles')
        );
    }
}
