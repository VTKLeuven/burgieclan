<?php

namespace App\Controller\Api;

use App\OauthProvider\LitusResourceOwner;
use App\Repository\UserRepository;
use DateTime;
use DateTimeInterface;
use Exception;
use Gesdinet\JWTRefreshTokenBundle\Generator\RefreshTokenGeneratorInterface;
use Gesdinet\JWTRefreshTokenBundle\Model\RefreshTokenManagerInterface;
use KnpU\OAuth2ClientBundle\Client\ClientRegistry;
use KnpU\OAuth2ClientBundle\Client\OAuth2Client;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Exception\ParameterNotFoundException;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Request;

class LitusOAuthCallbackController extends AbstractController
{
    public function __construct(
        private readonly JWTTokenManagerInterface       $jwtManager,
        private readonly RefreshTokenManagerInterface   $refreshTokenManager,
        private readonly RefreshTokenGeneratorInterface $refreshTokenGenerator,
        private readonly UserRepository                 $userRepository,
        private readonly ClientRegistry                 $clientRegistry,
        private readonly LoggerInterface                $logger
    ) {
    }

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
            $this->logger->critical("Frontend URL parameter not configured", [
                'exception' => $e,
            ]);
            throw new Exception('Frontend URL configuration missing. Please configure app.frontend_url parameter.');
        } catch (Exception $e) {
            $this->logger->critical("Invalid frontend URL configuration", [
                'exception' => $e,
            ]);
            throw new Exception('Invalid frontend URL configuration: ' . $e->getMessage());
        }

        // Handle OAuth error
        if ($error) {
            $this->logger->error("OAuth error received", [
                'oauth_error' => $error,
            ]);
            return new RedirectResponse(
                "{$frontendUrl}/auth/callback?error=oauth_failed"
            );
        }

        // Verify state parameter
        $sessionState = $request->cookies->get('x-oauth-state');
        if ($state !== $sessionState) {
            $this->logger->error("OAuth state mismatch", [
                'expected_state' => $sessionState,
                'received_state' => $state,
            ]);
            return new RedirectResponse(
                "{$frontendUrl}/auth/callback?error=invalid_state"
            );
        }

        try {
            // Use your existing Litus client
            /** @var OAuth2Client $client */
            $client = $this->clientRegistry->getClient('litus_api');

            // Exchange code for access token
            $accessToken = $client->getAccessToken();

            // Get user info using your existing LitusResourceOwner
            /** @var LitusResourceOwner $litusUser */
            $litusUser = $client->fetchUserFromToken($accessToken);

            // Create or find user
            $user = $this->userRepository->createUserfromLitusUser($litusUser, $accessToken);

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
            $frontendRedirectTo = $request->cookies->get('x-frontend-redirect-to', '/');

            // Redirect to frontend with all tokens and expiration
            return new RedirectResponse(
                "{$frontendUrl}/auth/callback?token=" . urlencode($jwt) .
                "&refresh_token=" . urlencode($refreshToken->getRefreshToken()) .
                "&refresh_token_expiration=" . $refreshTokenExpiration .
                "&redirect_to=" . urlencode($frontendRedirectTo)
            );
        } catch (Exception $e) {
            $this->logger->error("Litus OAuth callback error", [
                'exception' => $e,
                'oauth_state' => $state,
            ]);
            
            return new RedirectResponse(
                "{$frontendUrl}/auth/callback?error=authentication_failed"
            );
        }
    }
}
