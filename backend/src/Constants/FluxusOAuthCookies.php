<?php

namespace App\Constants;

/**
 * The cookies that carry an in-flight VTK authorization across the redirect to
 * vtk.be and back.
 *
 * The API firewall is stateless, so there is no session to keep this in. All three
 * are short-lived, HttpOnly and SameSite=Lax; the callback reads them once and the
 * response clears them again.
 */
final class FluxusOAuthCookies
{
    /** Where in the frontend the member should land after logging in. */
    public const FRONTEND_REDIRECT = 'x-frontend-redirect-to';

    /** CSRF protection for the authorization flow (RFC 6749 section 10.12). */
    public const STATE = 'x-oauth-state';

    /** The PKCE code verifier, exchanged for tokens in the callback. */
    public const PKCE_VERIFIER = 'x-oauth-pkce-verifier';

    /** An authorization that takes longer than this will not succeed anyway. */
    public const LIFETIME_SECONDS = 600;

    /**
     * @return list<string>
     */
    public static function all(): array
    {
        return [self::FRONTEND_REDIRECT, self::STATE, self::PKCE_VERIFIER];
    }
}
