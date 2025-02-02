<?php

namespace App\Tests\Security;

use App\OauthProvider\LitusResourceOwner;
use App\Repository\UserRepository;
use App\Security\LitusAuthenticator;
use KnpU\OAuth2ClientBundle\Client\ClientRegistry;
use KnpU\OAuth2ClientBundle\Client\OAuth2Client;
use League\OAuth2\Client\Token\AccessToken;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\RouterInterface;
use Symfony\Component\Security\Core\Exception\AuthenticationException;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\HttpFoundation\Session\Session;
use Symfony\Component\HttpFoundation\Session\Storage\MockArraySessionStorage;
use App\Entity\User;
use Symfony\Component\Security\Http\Authenticator\Passport\Badge\UserBadge;
use Symfony\Component\Security\Http\Authenticator\Passport\SelfValidatingPassport;

class LitusAuthenticatorTest extends TestCase
{
    private ClientRegistry $clientRegistry;
    private RouterInterface $router;
    private UserRepository $userRepository;
    private LitusAuthenticator $authenticator;

    protected function setUp(): void
    {
        $this->clientRegistry = $this->createMock(ClientRegistry::class);
        $this->router = $this->createMock(RouterInterface::class);
        $this->userRepository = $this->createMock(UserRepository::class);

        $this->authenticator = new LitusAuthenticator(
            $this->clientRegistry,
            $this->router,
            $this->userRepository
        );
    }

    public function testSupports(): void
    {
        $request = new Request();
        $request->attributes->set('_route', 'login_litus');

        $this->assertTrue($this->authenticator->supports($request));

        $request->attributes->set('_route', 'other_route');
        $this->assertFalse($this->authenticator->supports($request));
    }

    public function testStart(): void
    {
        $this->router
            ->expects($this->once())
            ->method('generate')
            ->with('login_litus_start')
            ->willReturn('/login/litus/start');

        $response = $this->authenticator->start(new Request());

        $this->assertEquals(Response::HTTP_TEMPORARY_REDIRECT, $response->getStatusCode());
        $this->assertEquals('/login/litus/start', $response->getTargetUrl());
    }

    public function testOnAuthenticationSuccess(): void
    {
        $this->router
            ->expects($this->once())
            ->method('generate')
            ->with('admin')
            ->willReturn('/admin');

        $request = new Request();
        $token = $this->createMock(TokenInterface::class);

        $response = $this->authenticator->onAuthenticationSuccess($request, $token, 'main');

        $this->assertEquals('/admin', $response->getTargetUrl());
    }

    public function testOnAuthenticationFailure(): void
    {
        // Create a Request with a session
        $request = new Request();
        $request->setSession(new Session(new MockArraySessionStorage()));

        $this->router
            ->expects($this->once())
            ->method('generate')
            ->with('security_login')
            ->willReturn('/login');

        $exception = new AuthenticationException();
        $response = $this->authenticator->onAuthenticationFailure($request, $exception);

        $this->assertEquals('/login', $response->getTargetUrl());
    }

    public function testAuthenticate(): void
    {
        // Set up mocks
        $client = $this->createMock(OAuth2Client::class);
        $accessToken = new AccessToken(['access_token' => 'test_token']);
        $litusUser = $this->createMock(LitusResourceOwner::class);
        $user = $this->createMock(User::class);

        // Mock the user repository
        $this->userRepository
            ->expects($this->once())
            ->method('createUserfromLitusUser')
            ->with($litusUser, $accessToken)
            ->willReturn($user);

        // Mock the client registry
        $this->clientRegistry
            ->expects($this->once())
            ->method('getClient')
            ->with('litus')
            ->willReturn($client);

        // Mock the client to return the access token
        $client
            ->expects($this->once())
            ->method('getAccessToken')
            ->willReturn($accessToken);

        // Mock the client to return the Litus user
        $client
            ->expects($this->once())
            ->method('fetchUserFromToken')
            ->with($accessToken)
            ->willReturn($litusUser);

        // Create request with code
        $request = new Request(['code' => 'some_code']);

        // Get the passport
        $passport = $this->authenticator->authenticate($request);

        // Trigger the UserBadge callback by getting the user
        $userBadge = $passport->getBadge(UserBadge::class);
        $this->assertNotNull($userBadge);
        $userLoader = $userBadge->getUserLoader();
        $loadedUser = $userLoader();

        // Assertions
        $this->assertInstanceOf(SelfValidatingPassport::class, $passport);
        $this->assertTrue($passport->hasBadge(UserBadge::class));
        $this->assertSame($user, $loadedUser);
    }
}