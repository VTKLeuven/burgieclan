<?php

namespace App\Controller\Api;

use App\Constants\FluxusOAuthCookies;
use KnpU\OAuth2ClientBundle\Client\ClientRegistry;
use LogicException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Cookie;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Request;

class FluxusOAuthInitiateController extends AbstractController
{
    public function __construct(
        private readonly ClientRegistry $clientRegistry
    ) {}


    public function __invoke(Request $request): RedirectResponse
    {
        $redirectTo = $request->query->get('redirect_to', '/');

        $client = $this->clientRegistry->getClient('fluxus_api');
        $provider = $client->getOAuth2Provider();

        // Building the URL is what generates both the state and the PKCE verifier,
        // so read them back only after this call.
        $redirectUrl = $provider->getAuthorizationUrl();

        $response = new RedirectResponse($redirectUrl);

        // The API firewall is stateless, so there is no session to park the flow in.
        // Cookies carry it instead. SameSite=Lax is required and sufficient: the
        // callback arrives as a top-level GET redirect from vtk.be, which Lax allows,
        // while Strict would drop the cookies and break every login.
        $secure = $request->isSecure();

        $response->headers->setCookie(
            $this->flowCookie(FluxusOAuthCookies::FRONTEND_REDIRECT, $redirectTo, $secure)
        );
        $response->headers->setCookie(
            $this->flowCookie(FluxusOAuthCookies::STATE, $provider->getState(), $secure)
        );
        // PKCE is mandatory on the VTK authorization server; without the verifier
        // here the token exchange in the callback fails. getAuthorizationUrl() sets
        // it because FluxusProvider declares an S256 method, so an empty value means
        // that method got lost and every login would break at the callback with a
        // far less obvious error.
        $pkceVerifier = $provider->getPkceCode();
        if (null === $pkceVerifier || '' === $pkceVerifier) {
            throw new LogicException(
                'The OAuth provider produced no PKCE verifier; check that FluxusProvider::getPkceMethod() '
                . 'still returns S256.'
            );
        }

        $response->headers->setCookie(
            $this->flowCookie(FluxusOAuthCookies::PKCE_VERIFIER, $pkceVerifier, $secure)
        );

        return $response;
    }

    private function flowCookie(string $name, string $value, bool $secure): Cookie
    {
        return Cookie::create($name)
            ->withValue($value)
            // An authorization flow that takes longer than this is not going to
            // succeed anyway, and a stale verifier is worth nothing.
            ->withExpires(time() + FluxusOAuthCookies::LIFETIME_SECONDS)
            ->withPath('/')
            ->withSecure($secure)
            ->withHttpOnly(true)
            ->withSameSite(Cookie::SAMESITE_LAX);
    }
}
