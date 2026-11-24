<?php

namespace App\Security;

use App\Repository\UserRepository;
use App\Service\VtkService\VtkServiceSignature;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Exception\AuthenticationException;
use Symfony\Component\Security\Core\Exception\CustomUserMessageAuthenticationException;
use Symfony\Component\Security\Http\Authenticator\AbstractAuthenticator;
use Symfony\Component\Security\Http\Authenticator\Passport\Badge\UserBadge;
use Symfony\Component\Security\Http\Authenticator\Passport\SelfValidatingPassport;

/**
 * The VTK website, speaking for one of its members, on the study planner routes.
 *
 * This is how the VTK app shows the same study planner as Burgieclan: the app talks to vtk.be,
 * and vtk.be calls these routes with a signed X-Vtk-User header (VtkServiceSignature) instead of
 * a JWT. The member is found or created exactly like on an SSO login (by `sub`, then by email),
 * so the app and Burgieclan always see one account and one planner.
 *
 * Only two prefixes: /api/study_planner, and /api/vtk_app (VtkAppController: courses, documents
 * to read, a file link, favourite courses). A leaked secret must not open the rest of the API
 * (uploads, votes, comments, moderation) in anyone's name; VtkAppController is kept to what the
 * app shows for exactly that reason. The exported calendar under /api/study_planner/feed/ needs
 * no login at all and is left alone.
 */
class VtkServiceAuthenticator extends AbstractAuthenticator
{
    public const PATH_PREFIX = '/api/study_planner';
    public const APP_PREFIX = '/api/vtk_app';

    public function __construct(
        private readonly VtkServiceSignature $signature,
        private readonly UserRepository $users,
    ) {}

    public function supports(Request $request): ?bool
    {
        $path = $request->getPathInfo();

        if (!$request->headers->has(VtkServiceSignature::HEADER_SIGNATURE)) {
            return false;
        }
        if (str_starts_with($path, self::APP_PREFIX . '/')) {
            return true;
        }

        return (self::PATH_PREFIX === $path || str_starts_with($path, self::PATH_PREFIX . '/'))
            && !str_starts_with($path, self::PATH_PREFIX . '/feed/');
    }

    public function authenticate(Request $request): SelfValidatingPassport
    {
        $identity = $this->signature->identity($request);
        if (null === $identity) {
            throw new CustomUserMessageAuthenticationException('Invalid VTK service signature.');
        }

        return new SelfValidatingPassport(
            new UserBadge(
                $identity['sub'],
                fn () => $this->users->findOrCreateFromVtkIdentity($identity['sub'], $identity['email'], $identity['name'])
            )
        );
    }

    public function onAuthenticationSuccess(Request $request, TokenInterface $token, string $firewallName): ?Response
    {
        return null;
    }

    public function onAuthenticationFailure(Request $request, AuthenticationException $exception): ?Response
    {
        return new JsonResponse(['code' => 401, 'message' => $exception->getMessageKey()], Response::HTTP_UNAUTHORIZED);
    }
}
