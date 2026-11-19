<?php

namespace App\Service\VtkService;

use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\Request;

/**
 * Checks that a request really comes from the VTK website, speaking for one of its members.
 *
 * The VTK app logs in to vtk.be with a session cookie and holds no Burgieclan token, so the VTK
 * website calls this backend itself and says in a signed header who the member is (see
 * VtkServiceAuthenticator). It signs "METHOD\nPATH\nTIMESTAMP\nUSER\nBODY" with HMAC-SHA256 and
 * VTK_SERVICE_SECRET, where USER is the base64url JSON {sub, email, name} it sends in X-Vtk-User:
 * a captured request cannot be replayed for another path, member or body, and not at all after
 * MAX_SKEW. The same scheme as CollabRequestSignature.
 *
 * The other side is apps/web/lib/burgieclan/signature.ts in vtk-website-new; keep the two equal.
 */
class VtkServiceSignature
{
    public const HEADER_USER = 'X-Vtk-User';
    public const HEADER_TIMESTAMP = 'X-Vtk-Timestamp';
    public const HEADER_SIGNATURE = 'X-Vtk-Signature';

    /** How far the VTK server's clock may drift from ours, in seconds. */
    public const MAX_SKEW = 300;

    public function __construct(
        #[Autowire(env: 'VTK_SERVICE_SECRET')]
        private readonly string $secret,
    ) {}

    /** Whether the link with the VTK website is switched on at all. */
    public function isConfigured(): bool
    {
        // An empty or short secret would make every signature trivially forgeable.
        return strlen($this->secret) >= 32;
    }

    public function sign(string $method, string $path, int $timestamp, string $user, string $body): string
    {
        return 'sha256=' . hash_hmac(
            'sha256',
            strtoupper($method) . "\n" . $path . "\n" . $timestamp . "\n" . $user . "\n" . $body,
            $this->secret
        );
    }

    /**
     * The member the request speaks for, or null when the signature does not hold.
     *
     * @return array{sub: string, email: string, name: string}|null
     */
    public function identity(Request $request, ?int $now = null): ?array
    {
        if (!$this->isConfigured()) {
            return null;
        }

        $user = $request->headers->get(self::HEADER_USER);
        $signature = $request->headers->get(self::HEADER_SIGNATURE);
        $timestamp = $request->headers->get(self::HEADER_TIMESTAMP);
        if (null === $user || null === $signature || null === $timestamp || 1 !== preg_match('/^\d{1,12}$/', $timestamp)) {
            return null;
        }
        if (abs(($now ?? time()) - (int) $timestamp) > self::MAX_SKEW) {
            return null;
        }

        $expected = $this->sign($request->getMethod(), $request->getPathInfo(), (int) $timestamp, $user, $request->getContent());
        if (!hash_equals($expected, $signature)) {
            return null;
        }

        $decoded = base64_decode(strtr($user, '-_', '+/'), true);
        $claims = false === $decoded ? null : json_decode($decoded, true);
        if (!is_array($claims)) {
            return null;
        }
        $sub = $claims['sub'] ?? null;
        $email = $claims['email'] ?? null;
        $name = $claims['name'] ?? null;
        if (!is_string($sub) || '' === $sub || !is_string($email) || '' === $email) {
            return null;
        }

        return ['sub' => $sub, 'email' => $email, 'name' => is_string($name) && '' !== $name ? $name : $email];
    }
}
