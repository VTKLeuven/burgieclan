<?php

namespace App\Controller\Api;

use KnpU\OAuth2ClientBundle\Client\ClientRegistry;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Cookie;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Request;

class LitusOAuthInitiateController extends AbstractController
{
    public function __construct(
        private readonly ClientRegistry $clientRegistry
    ) {
    }


    public function __invoke(Request $request): RedirectResponse
    {
        $redirectTo = $request->query->get('redirect_to', '/');

        // Use existing Litus client to initiate OAuth
        $client = $this->clientRegistry->getClient('litus_api');

        $redirectUrl = $client->getOAuth2Provider()->getAuthorizationUrl();

        $response = new RedirectResponse($redirectUrl);

        // Store the frontend redirect URL in cookie for later use
        // Session can't be used because it is stateless
        $response->headers->setCookie(new Cookie('x-frontend-redirect-to', $redirectTo));
        // Store the OAuth2 provider's generated state for verification
        $response->headers->setCookie(new Cookie('x-oauth-state', $client->getOAuth2Provider()->getState()));

        return $response;
    }
}
