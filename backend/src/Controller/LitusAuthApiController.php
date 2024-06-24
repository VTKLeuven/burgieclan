<?php

namespace App\Controller;

use App\ApiResource\LitusAuthApi;
use App\OauthProvider\Exception\LitusIdentityProviderException;
use App\OauthProvider\LitusResourceOwner;
use App\Repository\UserRepository;
use KnpU\OAuth2ClientBundle\Client\ClientRegistry;
use League\OAuth2\Client\Token\AccessToken;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Contracts\HttpClient\HttpClientInterface;

class LitusAuthApiController extends AbstractController
{
    public function __construct(
        private readonly ClientRegistry           $clientRegistry,
        private readonly UserRepository           $userRepository,
        private readonly JWTTokenManagerInterface $JWTManager,
    ) {
    }

    public function __invoke(LitusAuthApi $litusAuthApi, HttpClientInterface $httpClient): JsonResponse
    {
        $client = $this->clientRegistry->getClient("litus");
        $accessToken = new AccessToken(["access_token" => $litusAuthApi->accessToken]);

        try {
            /** @var LitusResourceOwner $litusUser */
            $litusUser = $client->fetchUserFromToken($accessToken);
        } catch (LitusIdentityProviderException $e) {
            // The LitusIdentityProviderException gets thrown when the access token is invalid or not existing.
            return new JsonResponse(['error' => $e->getMessage()], 400);
        }
        $user = $this->userRepository->createUserfromLitusUser($litusUser, $accessToken);
        $jwtToken = $this->JWTManager->create($user);
        return new JsonResponse(['token' => $jwtToken], 201);
    }
}
