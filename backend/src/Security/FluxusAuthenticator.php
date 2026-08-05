<?php

namespace App\Security;

use App\OauthProvider\FluxusResourceOwner;
use App\Repository\UserRepository;
use KnpU\OAuth2ClientBundle\Client\ClientRegistry;
use KnpU\OAuth2ClientBundle\Security\Authenticator\OAuth2Authenticator;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\RouterInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Exception\AuthenticationException;
use Symfony\Component\Security\Http\Authenticator\Passport\Badge\UserBadge;
use Symfony\Component\Security\Http\Authenticator\Passport\SelfValidatingPassport;
use Symfony\Component\Security\Http\EntryPoint\AuthenticationEntryPointInterface;

/**
 * VTK SSO for the Twig-rendered /admin area.
 *
 * Unlike the API flow this firewall is stateful, so the PKCE verifier rides along in
 * the session instead of in a cookie. It is put there by `login_fluxus_start`.
 */
class FluxusAuthenticator extends OAuth2Authenticator implements AuthenticationEntryPointInterface
{
    /** Session key holding the PKCE code verifier between start and callback. */
    public const PKCE_SESSION_KEY = 'fluxus_oauth_pkce_verifier';

    public function __construct(
        private readonly ClientRegistry $clientRegistry,
        private readonly RouterInterface $router,
        private readonly UserRepository $userRepository
    ) {}

    public function start(Request $request, ?AuthenticationException $authException = null): RedirectResponse
    {
        return new RedirectResponse($this->router->generate("login_fluxus_start"), Response::HTTP_TEMPORARY_REDIRECT);
    }

    public function supports(Request $request): ?bool
    {
        return $request->attributes->get("_route") === "login_fluxus";
    }

    public function authenticate(Request $request): SelfValidatingPassport
    {
        $client = $this->clientRegistry->getClient("fluxus_backend");

        // PKCE is mandatory on the VTK authorization server, and the verifier only
        // exists in the session because a different request generated it.
        $verifier = $request->getSession()->remove(self::PKCE_SESSION_KEY);
        if (!is_string($verifier) || '' === $verifier) {
            throw new AuthenticationException('Missing PKCE verifier; please start the login again.');
        }
        $client->getOAuth2Provider()->setPkceCode($verifier);

        $accessToken = $this->fetchAccessToken($client);

        return new SelfValidatingPassport(
            new UserBadge(
                $accessToken->getToken(),
                function () use ($accessToken, $client) {
                    /** @var FluxusResourceOwner $fluxusUser */
                    $fluxusUser = $client->fetchUserFromToken($accessToken);

                    return $this->userRepository->createUserFromFluxusUser($fluxusUser, $accessToken);
                }
            )
        );
    }

    public function onAuthenticationSuccess(Request $request, TokenInterface $token, string $firewallName): ?Response
    {
        $targetUrl = $this->router->generate('admin');
        return new RedirectResponse($targetUrl);
    }

    public function onAuthenticationFailure(Request $request, AuthenticationException $exception): ?Response
    {
        $this->saveAuthenticationErrorToSession($request, $exception);
        return new RedirectResponse($this->router->generate('security_login'));
    }
}
