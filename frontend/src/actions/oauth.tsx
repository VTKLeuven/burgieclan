'use server'

import {cookies} from 'next/headers'
import {getJWTExpiration, LitusOAuthRefresh} from '@/utils/oauth';
import {redirect} from 'next/navigation';

/**
 * Store JWT and Litus refresh token in Http-only cookies for session management
 */
export const storeOAuthTokens = async (jwt: string, refreshToken?: string) => {
    const expirationTime = getJWTExpiration(jwt);

    if (!expirationTime) {
        throw Error('JWT token is missing expiration time');
    }

    cookies().set({
        name: 'jwt',
        value: jwt,
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
    })

    // Set JWT expiration time http-only cookie
    // Stored separately so we don't have to do the decoding at every request to check if the JWT is expired
    cookies().set({
        name: 'jwt_expiration',
        value: expirationTime.toString(), // Store the JWT expiration Unix timestamp as a string
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
    })

    // Set Litus refresh token http-only cookie
    if (refreshToken) {
        cookies().set({
            name: 'litus_refresh',
            value: refreshToken,
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
        })
    }
}

/**
 * Check the presence of a JWT in http-only cookie
 */
export const hasJwt = async (): Promise<boolean> => {
    return !!cookies().get('jwt')?.value;
}

/**
 * Server Action that proxies an outgoing request, retrieves the JWT token from http-only cookie,
 * and sets it as a bearer token in the authorization header before executing the request.
 *
 * Handles automatic JWT refreshing if it's expired, or redirects to the login page if refresh fails.
 */
export const proxyRequest = async (method: string, url: string, body: any, customHeaders?: Headers): Promise<Response> => {
    const cookieStore = cookies();

    let jwt = cookieStore.get('jwt')?.value || null;
    let jwtUpdated = false;

    const jwtExpirationCookie = cookieStore.get('jwt_expiration')?.value; // Unix timestamp as string
    let jwtExpiration: number;

    let refreshToken = cookieStore.get('litus_refresh')?.value;

    const headers = new Headers(customHeaders);

    // Backend expects content-type when including JWT
    if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    if (jwt) {
        // Retrieve JWT expiration timestamp from cookie or by decoding JWT
        if (!jwtExpirationCookie) {
            jwtExpiration = getJWTExpiration(jwt);
        } else {
            jwtExpiration = parseInt(jwtExpirationCookie);
        }

        // Check if JWT is expired and refresh if necessary
        if (Date.now() > jwtExpiration * 1000) {
            // If no refresh token is available, redirect to login page
            if (!refreshToken) {
                redirectToLogin();
                return;
            }

            // Refresh OAuth tokens
            const { newJwt, newRefreshToken } = await LitusOAuthRefresh(refreshToken);

            // If refresh failed (e.g. refresh token expired), redirect to login page
            if (!newJwt || !newRefreshToken) {
                redirectToLogin();
                return;
            }

            jwt = newJwt;
            refreshToken = newRefreshToken;
            jwtUpdated = true;
        }
        headers.set('Authorization', `Bearer ${jwt}`);
    }

    // Forward request to the backend
    return await fetch(url, {
        method,
        headers,
        body: JSON.stringify(body),
    });
}

/**
 * Redirects to the login page with the current URL as the redirect target.
 */
function redirectToLogin() {
    const currentUrl = new URL(window.location.href);
    redirect(`/login?redirectTo=${encodeURIComponent(currentUrl.pathname)}`);
}