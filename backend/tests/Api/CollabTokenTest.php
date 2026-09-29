<?php

namespace App\Tests\Api;

use App\Entity\User;
use App\Factory\UserFactory;
use App\Service\Collab\CollabTokenIssuer;
use DateTimeImmutable;
use Lcobucci\JWT\Encoding\JoseEncoder;
use Lcobucci\JWT\Signer\Hmac\Sha256;
use Lcobucci\JWT\Signer\Key\InMemory;
use Lcobucci\JWT\Token\Parser;
use Lcobucci\JWT\UnencryptedToken;
use Lcobucci\JWT\Validation\Constraint\PermittedFor;
use Lcobucci\JWT\Validation\Constraint\SignedWith;
use Lcobucci\JWT\Validation\Validator;
use Zenstruck\Browser\KernelBrowser;

class CollabTokenTest extends ApiTestCase
{
    private const SECRET = 'test-collab-secret-0123456789abcdef0123456789';

    public function testRequiresLogin(): void
    {
        $this->browser()
            ->post('/api/collab/token', ['json' => ['document' => 'collab-test']])
            ->assertStatus(401);
    }

    public function testRegularUserCannotOpenTheTestDocument(): void
    {
        $this->requestToken($this->token, 'collab-test')->assertStatus(403);
    }

    public function testModeratorGetsAnEditTokenForTheTestDocument(): void
    {
        $attributes = [
            'plainPassword' => 'password',
            'roles' => [User::ROLE_MODERATOR],
            'fullName' => 'Mona Moderator',
        ];
        $moderator = UserFactory::createOne($attributes);
        $jwt = $this->getToken($moderator->getUsername(), 'password');

        $response = $this->requestToken($jwt, 'collab-test')
            ->assertStatus(200)
            ->json()
            ->decoded();

        $this->assertSame('edit', $response['mode']);

        $token = (new Parser(new JoseEncoder()))->parse($response['token']);
        $this->assertInstanceOf(UnencryptedToken::class, $token);

        $this->assertTrue(
            (new Validator())->validate(
                $token,
                new SignedWith(new Sha256(), InMemory::plainText(self::SECRET)),
                new PermittedFor(CollabTokenIssuer::AUDIENCE),
            )
        );

        $claims = $token->claims();
        $this->assertSame((string) $moderator->getId(), $claims->get('sub'));
        $this->assertSame('collab-test', $claims->get('doc'));
        $this->assertSame('edit', $claims->get('mode'));
        $this->assertSame('Mona Moderator', $claims->get('name'));

        $expiresAt = $claims->get('exp');
        $this->assertInstanceOf(DateTimeImmutable::class, $expiresAt);
        $this->assertGreaterThan(new DateTimeImmutable('+9 minutes'), $expiresAt);
        $this->assertLessThanOrEqual(new DateTimeImmutable('+10 minutes'), $expiresAt);
    }

    public function testAdminCountsAsModerator(): void
    {
        $admin = UserFactory::createOne(['plainPassword' => 'password', 'roles' => [User::ROLE_ADMIN]]);

        $this->requestToken($this->getToken($admin->getUsername(), 'password'), 'collab-test')
            ->assertStatus(200);
    }

    public function testUnknownDocumentIsDenied(): void
    {
        $moderator = UserFactory::createOne(['plainPassword' => 'password', 'roles' => [User::ROLE_MODERATOR]]);

        $this->requestToken($this->getToken($moderator->getUsername(), 'password'), 'exam-1')
            ->assertStatus(403);
    }

    public function testInvalidDocumentNameIsRejected(): void
    {
        foreach (['', 'Collab-Test', '../etc/passwd', str_repeat('a', 101)] as $name) {
            $this->requestToken($this->token, $name)->assertStatus(400);
        }

        $notJson = [
            'headers' => ['Authorization' => 'Bearer ' . $this->token],
            'body' => 'not json',
        ];
        $this->browser()->post('/api/collab/token', $notJson)->assertStatus(400);
    }

    private function requestToken(string $jwt, string $document): KernelBrowser
    {
        $options = [
            'headers' => ['Authorization' => 'Bearer ' . $jwt],
            'json' => ['document' => $document],
        ];

        return $this->browser()->post('/api/collab/token', $options);
    }
}
