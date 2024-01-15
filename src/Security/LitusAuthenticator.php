<?php

namespace App\Security;

use App\Entity\User;
use App\OauthProvider\LitusResourceOwner;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use KnpU\OAuth2ClientBundle\Client\ClientRegistry;
use KnpU\OAuth2ClientBundle\Security\Authenticator\OAuth2Authenticator;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\RouterInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Exception\AuthenticationException;
use Symfony\Component\Security\Http\Authenticator\Passport\Badge\UserBadge;
use Symfony\Component\Security\Http\EntryPoint\AuthenticationEntryPointInterface;
use Symfony\Component\Security\Http\Authenticator\Passport\SelfValidatingPassport;

class LitusAuthenticator extends OAuth2Authenticator implements AuthenticationEntryPointInterface
{
    public function __construct(
        private readonly ClientRegistry $clientRegistry,
        private readonly EntityManagerInterface $em,
        private readonly RouterInterface $router,
        private readonly UserRepository $userRepository
    ) {
    }

    public function start(Request $request, AuthenticationException $authException = null): RedirectResponse
    {
        return new RedirectResponse($this->router->generate("login_litus_start"), Response::HTTP_TEMPORARY_REDIRECT);
    }

    public function supports(Request $request): ?bool
    {
        return $request->attributes->get("_route") === "login_litus";
    }

    public function authenticate(Request $request): SelfValidatingPassport
    {
        $client = $this->clientRegistry->getClient("litus");
        $accessToken = $this->fetchAccessToken($client);
        return new SelfValidatingPassport(
            new UserBadge($accessToken->getToken(), function () use ($accessToken, $client) {
                /** @var LitusResourceOwner $litusUser */
                $litusUser = $client->fetchUserFromToken($accessToken);

                $user = $this->userRepository->findOneBy(["username" => $litusUser->getUsername()]);
                if (null === $user) {
                    $user = new User();
                    $user->setUsername($litusUser->getUsername());
                    $user->setEmail($litusUser->getEmail());
                    $user->setFullName($litusUser->getFullName());
                    $user->setPassword('');
                    $user->setRoles([User::ROLE_USER]);

                    $this->em->persist($user);
                }

                $this->em->flush();

                return $user;
            })
        );
    }

    public function onAuthenticationSuccess(Request $request, TokenInterface $token, string $firewallName): ?Response
    {
        $targetUrl = $this->router->generate('blog_index');
        return new RedirectResponse($targetUrl);
    }

    public function onAuthenticationFailure(Request $request, AuthenticationException $exception): ?Response
    {
        $message = strtr($exception->getMessageKey(), $exception->getMessageData());
        return new Response($message, Response::HTTP_FORBIDDEN);
    }
}
