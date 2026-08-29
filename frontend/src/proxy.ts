import type { Page } from "@/types/entities";
import { convertToPage } from "@/utils/convertToEntity";
import { COOKIE_NAMES } from "@/utils/cookieNames";
import { decodeJWT, isJWTExpired } from "@/utils/jwt";
import { refreshTokenExpiry, SESSION_COOKIE_SAME_SITE } from "@/utils/sessionCookies";
import { captureException } from "@sentry/nextjs";
import { i18nRouter } from 'next-i18n-router';
import { NextRequest, NextResponse } from "next/server";
import { i18nConfig } from '../i18nConfig';

/**
 * Fetches the list of public pages from the backend
 */
const getPublicAvailablePages = async (): Promise<Page[]> => {
    const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendBaseUrl) {
        throw new Error(`Missing environment variable for backend base URL`)
    }
    const url = backendBaseUrl + '/api/pages';
    try {
        const response = await fetch(url, {
            method: 'GET'
        });
        const data = await response.json();

        const pages: Page[] = data['hydra:member'].map(convertToPage);
        return pages;
    } catch (error) {
        captureException(
            error instanceof Error ? error : new Error(String(error)),
            {
                extra: { context: "Error fetching public pages" },
            }
        );
        return [];
    }
}

const startsWithAllowedPath = (pathWithoutLocale: string): boolean => {
    const allowedPaths = [
        'login',
        'auth', // for OAuth callback
        'api',
    ];

    return allowedPaths.some((path) => pathWithoutLocale.startsWith(path));
}

/**
 * Check if the page with the given URL key is public
 */
const isPublicPage = async (urlKey: string) => {
    const pages = await getPublicAvailablePages();
    return pages.some((page: Page) => page.urlKey === urlKey);
};

/**
 * Check if user is authenticated based on JWT in cookies
 * Returns true only if JWT exists AND is not expired
 */
const checkAuthentication = (request: NextRequest): boolean => {
    const jwt = request.cookies.get(COOKIE_NAMES.JWT)?.value;

    if (!jwt) {
        return false;
    }

    // Check if JWT is expired
    if (isJWTExpired(jwt)) {
        return false;
    }

    return true;
};

/**
 * Attempt to refresh tokens in middleware
 * This is a simplified version that doesn't store cookies (Edge Runtime limitation)
 */
/**
 * What a refresh hands back. The refresh token matters as much as the JWT: refresh tokens are
 * single-use, so the backend replaces the one that was spent, and a client that keeps the old
 * one is holding a token that has already been invalidated.
 */
interface RefreshedSession {
    jwt: string;
    refreshToken?: string;
    refreshTokenExpiration?: number;
}

const tryRefreshToken = async (request: NextRequest): Promise<RefreshedSession | null> => {
    const refreshToken = request.cookies.get(COOKIE_NAMES.REFRESH_TOKEN)?.value;

    if (!refreshToken) {
        return null;
    }

    try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/token/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                refresh_token: refreshToken
            }),
        });

        if (response.ok) {
            const data = await response.json();
            return {
                jwt: data.token,
                refreshToken: data.refresh_token,
                refreshTokenExpiration: data.refresh_token_expiration,
            };
        }

        return null;
    } catch (error) {
        captureException(
            error instanceof Error ? error : new Error(String(error)),
            {
                extra: { context: "Token refresh failed in middleware" },
            }
        );
        return null;
    }
};

export default async function proxy(request: NextRequest) {
    const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || request.url;

    // Match and extract the locale from the URL path
    const localeMatch = request.nextUrl.pathname.match(/^\/([a-z]{2})(?:\/|$)/);
    const locale = localeMatch ? localeMatch[1] : '';
    const pathWithoutLocale = locale ? request.nextUrl.pathname.slice(3).replace(/^\/|\/$/g, '') : request.nextUrl.pathname.slice(1).replace(/^\/|\/$/g, '');

    // Check if path is allowed without authentication
    if (startsWithAllowedPath(pathWithoutLocale)) {
        return i18nRouter(request, i18nConfig);
    }

    // Check authentication
    let isAuthenticated = checkAuthentication(request);
    // Set once the backend has actually rejected the refresh token: the only proof
    // we get here that the session is dead rather than merely unproven.
    let sessionRejected = false;

    // If not authenticated, try to refresh tokens
    if (!isAuthenticated) {
        const jwt = request.cookies.get(COOKIE_NAMES.JWT)?.value;
        const refreshToken = request.cookies.get(COOKIE_NAMES.REFRESH_TOKEN)?.value;

        // Try refresh if:
        // 1. We have a refresh token AND
        // 2. Either no JWT OR an expired JWT
        if (refreshToken && (!jwt || isJWTExpired(jwt))) {
            const refreshed = await tryRefreshToken(request);

            if (refreshed) {
                // Create response with new JWT cookie
                const response = i18nRouter(request, i18nConfig);

                // Calculate new JWT expiration
                const jwtPayload = decodeJWT(refreshed.jwt);
                const jwtExpiration = jwtPayload?.exp ? new Date(jwtPayload.exp * 1000) : new Date(Date.now() + 15 * 60 * 1000); // 15 min fallback

                // Set new JWT cookie
                response.cookies.set({
                    name: COOKIE_NAMES.JWT,
                    value: refreshed.jwt,
                    path: '/',
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: SESSION_COOKIE_SAME_SITE,
                    expires: jwtExpiration,
                });

                // And the replacement refresh token. Spending one invalidates it server-side,
                // so keeping the old one meant the session survived exactly one refresh: the
                // hour after that, the next refresh was rejected and the reader was thrown
                // back to the login page with a month of session life left unused.
                if (refreshed.refreshToken) {
                    response.cookies.set({
                        name: COOKIE_NAMES.REFRESH_TOKEN,
                        value: refreshed.refreshToken,
                        path: '/',
                        httpOnly: true,
                        secure: process.env.NODE_ENV === 'production',
                        sameSite: SESSION_COOKIE_SAME_SITE,
                        expires: refreshTokenExpiry(refreshed.refreshTokenExpiration),
                    });
                }

                // Mark as authenticated since we got a new token
                isAuthenticated = true;
                return response;
            }

            sessionRejected = true;
        }
    }

    // If still not authenticated, check if page is public
    if (!isAuthenticated) {
        const publicPage = await isPublicPage(pathWithoutLocale);
        if (!publicPage) {
            const loginUrl = locale ? `/${locale}/login` : '/login';
            // Use pathname instead of href to avoid localhost:3000
            // Only add redirectTo if pathname is not root
            const redirectUrl = request.nextUrl.pathname === '/' || request.nextUrl.pathname === ''
                ? loginUrl
                : `${loginUrl}?redirectTo=${encodeURIComponent(request.nextUrl.pathname)}`;

            const response = NextResponse.redirect(new URL(redirectUrl, baseUrl));

            // Only clear on a rejected refresh. This runs on prefetches too, so
            // clearing whenever the cookies look absent logs out a session that was
            // still being established.
            // The path has to match the one storeTokensInCookies() set, or the browser
            // scopes the deletion to the requesting URL's directory (e.g. /en/documents)
            // and leaves the real Path=/ cookie in place. Same reason as in
            // clearTokenCookies().
            if (sessionRejected) {
                response.cookies.delete({ name: COOKIE_NAMES.JWT, path: '/' });
                response.cookies.delete({ name: COOKIE_NAMES.REFRESH_TOKEN, path: '/' });
            }

            return response;
        }
    }

    // Allow access
    return i18nRouter(request, i18nConfig);
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - public/images (public images)
         * - favicon.ico, sitemap.xml, robots.txt (metadata files)
         */
        '/((?!_next/static|_next/image|images|favicon.ico|sitemap.xml|robots.txt).*)',
    ],
}