<?php

namespace App\Tests\Api;

use App\Constants\Feature;
use App\Entity\FeatureFlag;
use App\Factory\UserFactory;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\Component\Security\Core\Exception\AuthenticationException;
use Zenstruck\Browser\HttpOptions;
use Zenstruck\Browser\KernelBrowser;
use Zenstruck\Browser\Test\HasBrowser;

abstract class ApiTestCase extends KernelTestCase
{
    use HasBrowser {
        browser as baseKernelBrowser;
    }

    protected string $token;

    protected function browser(array $options = [], array $server = []): KernelBrowser
    {
        return $this->baseKernelBrowser($options, $server)
            ->setDefaultHttpOptions(HttpOptions::create()->withHeader('Accept', 'application/ld+json'));
    }

    protected function setUp(): void
    {
        $user = UserFactory::createOne(['plainPassword' => 'password']);
        $this->token = $this->getToken($user->getUsername(), 'password');
    }

    /**
     * Switches a feature on for this test. Features are off without a row (App\Constants\Feature).
     */
    protected static function enableFeature(Feature $feature): void
    {
        $entityManager = self::getContainer()->get(EntityManagerInterface::class);
        $entityManager->persist(new FeatureFlag($feature, true));
        $entityManager->flush();
    }

    protected function getToken(string $username, string $password)
    {
        $tokenResponse = $this->browser()
            ->post(
                '/api/auth/login',
                HttpOptions::json(
                    [
                        'username' => $username,
                        'password' => $password,
                    ]
                )
            )
            ->json()
            ->decoded();

        if (!isset($tokenResponse['token'])) {
            throw new AuthenticationException('Token not found');
        }
        return $tokenResponse['token'];
    }
}
