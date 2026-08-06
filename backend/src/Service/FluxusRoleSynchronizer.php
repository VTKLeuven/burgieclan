<?php

namespace App\Service;

use App\Entity\User;
use App\OauthProvider\FluxusResourceOwner;

/**
 * Translates the VTK permission codes on /oauth2/userinfo into Burgieclan roles.
 *
 * VTK deliberately does not expose its own roles or posten, so this maps codes that
 * Burgieclan itself defined under the `burgieclan` namespace in the VTK admin. Which
 * VTK role or post carries those codes is decided there, not here, and it resets
 * with the working year on 15 July.
 */
class FluxusRoleSynchronizer
{
    /**
     * The namespace Burgieclan owns on the VTK authorization server.
     */
    public const NAMESPACE = 'burgieclan';

    /**
     * ROLE_SUPER_ADMIN is intentionally absent: the highest privilege in this
     * application should never depend on an external service being reachable and
     * correctly configured. It is handed out locally or not at all.
     *
     * @var array<string, string>
     */
    private const ROLE_BY_PERMISSION = [
        'burgieclan.moderate' => User::ROLE_MODERATOR,
        'burgieclan.admin' => User::ROLE_ADMIN,
    ];

    /**
     * Write the roles VTK grants onto the user.
     *
     * Does nothing when VTK did not answer the question. That is the whole point of
     * persisting `ssoRoles`: a timeout, a 500, or a client that lost the
     * `entitlements` scope must not cost a moderator their rights. An empty list
     * that did arrive is a real answer and does clear the roles.
     *
     * Callers still have to flush; this only mutates the entity.
     */
    public function synchronize(User $user, FluxusResourceOwner $fluxusUser): void
    {
        if (!$fluxusUser->hasPermissionsClaim()) {
            return;
        }

        $user->setSsoRoles($this->mapPermissions($fluxusUser->getPermissions()));
    }

    /**
     * Unknown codes are ignored rather than treated as an error: VTK must be able to
     * add codes to our namespace without breaking logins here.
     *
     * @param list<string> $permissions
     * @return list<string>
     */
    public function mapPermissions(array $permissions): array
    {
        $roles = [];

        foreach ($permissions as $permission) {
            if (isset(self::ROLE_BY_PERMISSION[$permission])) {
                $roles[] = self::ROLE_BY_PERMISSION[$permission];
            }
        }

        return array_values(array_unique($roles));
    }
}
