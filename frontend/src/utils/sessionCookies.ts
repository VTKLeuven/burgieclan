/**
 * How long a session survives without anyone logging in again, and how its cookies are scoped.
 *
 * Shared by the proxy and the server actions because both write these cookies, and a mismatch
 * between the two is invisible until a session quietly dies.
 */

/**
 * `lax`, not `strict`.
 *
 * Under `strict` the browser withholds session cookies on any navigation that started somewhere
 * else, so arriving from a link in Discord, Teams or a mail read as "not logged in" and bounced
 * the reader to the login page - even with a perfectly valid month-old session sitting in the
 * jar. `lax` still withholds them on cross-site POSTs, which is the case CSRF actually needs,
 * and is the standard setting for a session cookie.
 */
export const SESSION_COOKIE_SAME_SITE = 'lax' as const;

/** Matches the backend's gesdinet_jwt_refresh_token ttl; used when a response omits its own. */
const REFRESH_TOKEN_FALLBACK_DAYS = 30;

/**
 * When the refresh-token cookie should expire, from the Unix timestamp the backend sends back.
 *
 * The cookie must not outlive the token it carries, and must not die before it either: an
 * expiry shorter than the token's throws away session life the backend was still honouring.
 */
export function refreshTokenExpiry(expiration?: number): Date {
    return typeof expiration === 'number'
        ? new Date(expiration * 1000)
        : new Date(Date.now() + REFRESH_TOKEN_FALLBACK_DAYS * 24 * 60 * 60 * 1000);
}
