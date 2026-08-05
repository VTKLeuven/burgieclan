<?php

namespace App\Controller\Api;

use App\Constants\FluxusOAuthCookies;
use App\OauthProvider\FluxusResourceOwner;
use App\Repository\UserRepository;
use Exception;
use Gesdinet\JWTRefreshTokenBundle\Generator\RefreshTokenGeneratorInterface;
use Gesdinet\JWTRefreshTokenBundle\Model\RefreshTokenManagerInterface;
use KnpU\OAuth2ClientBundle\Client\ClientRegistry;
use KnpU\OAuth2ClientBundle\Client\OAuth2Client;
use League\OAuth2\Client\Token\AccessToken;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Exception\ParameterNotFoundException;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Request;

class FluxusOAuthCallbackController extends AbstractController
{
    public function __construct(
        private readonly JWTTokenManagerInterface $jwtManager,
        private readonly RefreshTokenManagerInterface $refreshTokenManager,
        private readonly RefreshTokenGeneratorInterface $refreshTokenGenerator,
        private readonly UserRepository $userRepository,
        private readonly ClientRegistry $clientRegistry,
        private readonly LoggerInterface $logger
    ) {}

    public function __invoke(Request $request): RedirectResponse
    {
        $state = $request->query->get('state');
        $error = $request->query->get('error');

        // Get frontend URL from environment with validation
        try {
            $frontendUrl = $this->getParameter('app.frontend_url');
            if (empty($frontendUrl)) {
                throw new Exception('Frontend URL parameter is empty');
            }
            $frontendUrl = rtrim($frontendUrl, '/');
        } catch (ParameterNotFoundException $e) {
            $this->logger->critical(
                "Frontend URL parameter not configured",
                [
                    'exception' => $e,
                ]
            );
            throw new Exception('Frontend URL configuration missing. Please configure app.frontend_url parameter.');
        } catch (Exception $e) {
            $this->logger->critical(
                "Invalid frontend URL configuration",
                [
                    'exception' => $e,
                ]
            );
            throw new Exception('Invalid frontend URL configuration: ' . $e->getMessage());
        }

        // Handle OAuth error. `access_denied` is the one to expect in normal use:
        // it means the member declined on the VTK consent screen.
        if ($error) {
            $this->logger->error(
                "OAuth error received",
                [
                    'oauth_error' => $error,
                ]
            );
            return $this->finish($request, "{$frontendUrl}/auth/callback?error=oauth_failed");
        }

        // Verify state parameter. KnpU is configured stateless, so it does not do
        // this itself; the cookie set during initiate is the expected value.
        $sessionState = $request->cookies->get(FluxusOAuthCookies::STATE);
        if (!$state || !$sessionState || !hash_equals($sessionState, $state)) {
            $this->logger->error(
                "OAuth state mismatch",
                [
                    'expected_state' => $sessionState,
                    'received_state' => $state,
                ]
            );
            return $this->finish($request, "{$frontendUrl}/auth/callback?error=invalid_state");
        }

        $pkceVerifier = $request->cookies->get(FluxusOAuthCookies::PKCE_VERIFIER);
        if (!$pkceVerifier) {
            // Without the verifier the token exchange cannot succeed; failing here
            // gives a clearer error than letting VTK reject the request.
            $this->logger->error("OAuth PKCE verifier cookie missing");
            return $this->finish($request, "{$frontendUrl}/auth/callback?error=invalid_state");
        }

        try {
            /** @var OAuth2Client $client */
            $client = $this->clientRegistry->getClient('fluxus_api');

            // The verifier was generated in the initiate controller and parked in a
            // cookie; the provider needs it back before it will send code_verifier.
            $client->getOAuth2Provider()->setPkceCode($pkceVerifier);

            // Exchange code for access token
            /** @var AccessToken $accessToken */
            $accessToken = $client->getAccessToken();

            // Fetch the claims. `permissions` lives only on UserInfo, never in the
            // access token, so this call is what drives the role sync.
            /** @var FluxusResourceOwner $fluxusUser */
            $fluxusUser = $client->fetchUserFromToken($accessToken);

            // Create or find user
            $user = $this->userRepository->createUserFromFluxusUser($fluxusUser, $accessToken);

            // Generate JWT
            $jwt = $this->jwtManager->create($user);

            // Get refresh token TTL from configuration (in seconds)
            $refreshTokenTtl = $this->getParameter('gesdinet_jwt_refresh_token.ttl');

            // Generate refresh token using the generator
            $refreshToken = $this->refreshTokenGenerator->createForUserWithTtl(
                $user,
                $refreshTokenTtl
            );

            // Save the refresh token
            $this->refreshTokenManager->save($refreshToken);

            // Get the expiration timestamp
            $refreshTokenExpiration = $refreshToken->getValid()->getTimestamp();

            // Get frontend redirect URL
            $frontendRedirectTo = $request->cookies->get(FluxusOAuthCookies::FRONTEND_REDIRECT, '/');

            // Redirect to frontend with all tokens and expiration. The VTK token
            // itself never reaches the browser: it is used once here and dropped.
            // It would expire in ten minutes anyway, because it carries
            // `entitlements`.
            return $this->finish(
                $request,
                "{$frontendUrl}/auth/callback?token=" . urlencode($jwt) .
                    "&refresh_token=" . urlencode($refreshToken->getRefreshToken()) .
                    "&refresh_token_expiration=" . $refreshTokenExpiration .
                    "&redirect_to=" . urlencode($frontendRedirectTo)
            );
        } catch (Exception $e) {
            $this->logger->error(
                "Fluxus OAuth callback error",
                [
                    'exception' => $e,
                    'oauth_state' => $state,
                ]
            );

            return $this->finish($request, "{$frontendUrl}/auth/callback?error=authentication_failed");
        }
    }

    /**
     * Redirect to the frontend and clear the flow cookies on the way out, so a
     * failed attempt cannot leave a stale verifier or state behind.
     */
    private function finish(Request $request, string $url): RedirectResponse
    {
        $response = new RedirectResponse($url);

        foreach (FluxusOAuthCookies::all() as $cookie) {
            $response->headers->clearCookie($cookie, '/', null, $request->isSecure(), true, 'lax');
        }

        return $response;
    }
}
