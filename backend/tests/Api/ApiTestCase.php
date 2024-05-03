<?php

namespace App\Tests\Api;

use App\Factory\UserFactory;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
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

        $tokenResponse = $this->browser()
            ->post('/api/auth/login', HttpOptions::json([
                'username' => $user->getUsername(),
                'password' => 'password',
            ]))
            ->json()
            ->decoded();
        $this->token = $tokenResponse['token'];
    }
}