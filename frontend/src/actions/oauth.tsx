'use server'

import { cookies } from 'next/headers'
import { getJWTExpiration } from '@/utils/oauth';

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

    console.log("tokens stored successfully");
}

/**
 * Check the presence of a JWT in http-only cookie
 */
export const hasJwt = async (): Promise<boolean> => {
    return !!cookies().get('jwt')?.value;
}

/**
 * Proxies an outgoing token request to the Litus OAuth server.
 *
 * This is done by a Server Action to avoid CORS issues taking place when calling the Litus endpoint directly from the
 * client.
 */
export const proxyTokenRequest = async (body: any): Promise<{ accessToken: string, refreshToken: string }> => {
    if (!process.env.NEXT_PUBLIC_LITUS_OAUTH_TOKEN) {
        throw new Error('Missing environment variable for Litus OAuth token endpoint')
    }

    const response = await fetch(process.env.NEXT_PUBLIC_LITUS_OAUTH_TOKEN!, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(body).toString(), // Format body as application/x-www-form-urlencoded
    });

    const responseData = await response.json();
    console.log(responseData);
    return {
        accessToken: responseData.access_token,
        refreshToken: responseData.refresh_token,
    };
}