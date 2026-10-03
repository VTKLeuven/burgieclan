<?php

namespace App\Service\Collab;

use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\Request;

/**
 * Checks that a request to the internal collab routes really comes from the collab server.
 *
 * Those routes are not reachable from outside in production (the public nginx only forwards
 * /api, /admin and a few other prefixes to Symfony), but they are on localhost:8000 in local
 * development, and a second lock costs nothing. The collab server signs
 * "METHOD\nPATH\nTIMESTAMP\nBODY" with HMAC-SHA256 and COLLAB_SECRET; the timestamp bounds how
 * long a captured request could be replayed. The secret itself never travels over the wire.
 *
 * The same scheme is implemented on the other side in collab/src/backend.ts.
 */
class CollabRequestSignature
{
    public const HEADER_SIGNATURE = 'X-Collab-Signature';
    public const HEADER_TIMESTAMP = 'X-Collab-Timestamp';

    /** How far the collab server's clock may drift from ours, in seconds. */
    public const MAX_SKEW = 300;

    public function __construct(
        #[Autowire(env: 'COLLAB_SECRET')]
        private readonly string $secret,
    ) {}

    public function sign(string $method, string $path, int $timestamp, string $body): string
    {
        return 'sha256=' . hash_hmac(
            'sha256',
            strtoupper($method) . "\n" . $path . "\n" . $timestamp . "\n" . $body,
            $this->secret
        );
    }

    public function isValid(Request $request, ?int $now = null): bool
    {
        // An empty secret would make every signature trivially forgeable.
        if (strlen($this->secret) < 32) {
            return false;
        }

        $signature = $request->headers->get(self::HEADER_SIGNATURE);
        $timestamp = $request->headers->get(self::HEADER_TIMESTAMP);

        if (null === $signature || null === $timestamp || 1 !== preg_match('/^\d{1,12}$/', $timestamp)) {
            return false;
        }

        if (abs(($now ?? time()) - (int) $timestamp) > self::MAX_SKEW) {
            return false;
        }

        $expected = $this->sign(
            $request->getMethod(),
            $request->getPathInfo(),
            (int) $timestamp,
            $request->getContent()
        );

        return hash_equals($expected, $signature);
    }
}
