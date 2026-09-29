<?php

namespace App\Tests\Service\Collab;

use App\Service\Collab\CollabRequestSignature;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;

class CollabRequestSignatureTest extends TestCase
{
    private const SECRET = 'test-collab-secret-0123456789abcdef0123456789';

    public function testMatchesTheCollabServer(): void
    {
        // Same vector as collab/test/collab.test.ts, so the PHP and Node sides cannot drift apart.
        $this->assertSame(
            'sha256=d64da9e2d00802bb65daa29f5e5f5825d0fd7b57024116f9cb64ee7da8b7d161',
            (new CollabRequestSignature(self::SECRET))->sign(
                'put',
                '/internal/collab/documents/collab-test',
                1700000000,
                '{"state":"AQI=","content":null}'
            )
        );
    }

    public function testAcceptsASignedRequest(): void
    {
        $signature = new CollabRequestSignature(self::SECRET);
        $request = $this->signedRequest($signature, 1700000000);

        $this->assertTrue($signature->isValid($request, 1700000000));
        $this->assertTrue($signature->isValid($request, 1700000000 + CollabRequestSignature::MAX_SKEW));
        $this->assertFalse($signature->isValid($request, 1700000000 + CollabRequestSignature::MAX_SKEW + 1));
    }

    public function testNeverAcceptsAnythingWithoutAProperSecret(): void
    {
        $unconfigured = new CollabRequestSignature('');
        $request = $this->signedRequest($unconfigured, 1700000000);

        $this->assertFalse($unconfigured->isValid($request, 1700000000));
    }

    private function signedRequest(CollabRequestSignature $signature, int $timestamp): Request
    {
        $body = '{"state":"AQI=","content":null}';
        $request = Request::create('/internal/collab/documents/collab-test', 'PUT', content: $body);
        $request->headers->set(CollabRequestSignature::HEADER_TIMESTAMP, (string) $timestamp);
        $request->headers->set(
            CollabRequestSignature::HEADER_SIGNATURE,
            $signature->sign('PUT', '/internal/collab/documents/collab-test', $timestamp, $body)
        );

        return $request;
    }
}
