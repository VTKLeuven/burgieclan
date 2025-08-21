<?php

namespace App\Controller\Api;

use KnpU\OAuth2ClientBundle\Client\ClientRegistry;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
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

        // Store the frontend redirect URL in session for later use
        $request->getSession()->set('frontend_redirect_to', $redirectTo);

        // Use existing Litus client to initiate OAuth
        $client = $this->clientRegistry->getClient('litus_api');

        $redirectUrl = $client->getOAuth2Provider()->getAuthorizationUrl();

        // Store the OAuth2 provider's generated state for verification
        $request->getSession()->set('oauth_state', $client->getOAuth2Provider()->getState());

        return new RedirectResponse($redirectUrl);
    }
}
