<?php

namespace App\Tests\Entity;

use App\Entity\User;
use League\OAuth2\Client\Token\AccessToken;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

class UserTest extends KernelTestCase
{
    private User $user;

    protected function setUp(): void
    {
        $this->user = new User();
    }

    public function testGetRolesReturnsDefaultUserRoleWhenEmpty(): void
    {
        $roles = $this->user->getRoles();

        $this->assertContains(User::ROLE_USER, $roles);
        $this->assertCount(1, $roles);
    }

    public function testGetRolesReturnsUniqueRoles(): void
    {
        $this->user->setRoles(['ROLE_ADMIN', 'ROLE_ADMIN']);
        $roles = $this->user->getRoles();

        $this->assertCount(1, $roles);
        $this->assertContains(User::ROLE_ADMIN, $roles);
    }

    public function testGetRolesIncludesCustomRoles(): void
    {
        $expectedRoles = ['ROLE_ADMIN', 'ROLE_MODERATOR'];
        $this->user->setRoles($expectedRoles);

        $this->assertEqualsCanonicalizing($expectedRoles, $this->user->getRoles());
    }

    public function testEraseCredentialsClearsPlainPassword(): void
    {
        $this->user->setPlainPassword('secret123');
        $this->user->setPassword('hashed_password_123');

        $this->user->eraseCredentials();

        $this->assertNull($this->user->getPlainPassword());
        $this->assertEquals('hashed_password_123', $this->user->getPassword());
    }

    public function testAccessTokenHandling(): void
    {
        $tokenData = [
            'access_token' => 'token123',
            'expires_in' => 3600,
            'token_type' => 'bearer',
        ];
        $accessToken = new AccessToken($tokenData);

        $this->user->setAccesstoken($accessToken);

        $retrievedToken = $this->user->getAccesstoken();
        $this->assertInstanceOf(AccessToken::class, $retrievedToken);
        $this->assertEquals($tokenData['access_token'], $retrievedToken->getToken());
    }

    public function testSerializationAndUnserialization(): void
    {
        $this->user->setUsername('testuser');
        $this->user->setPassword('hashedpass123');

        $reflection = new \ReflectionClass(User::class);
        $idProperty = $reflection->getProperty('id');
        $idProperty->setValue($this->user, 123);

        $serialized = $this->user->__serialize();

        $newUser = new User();
        $newUser->__unserialize($serialized);

        $this->assertEquals($this->user->getUsername(), $newUser->getUsername());
        $this->assertEquals($this->user->getPassword(), $newUser->getPassword());
        $this->assertEquals(123, $idProperty->getValue($newUser));
    }
}