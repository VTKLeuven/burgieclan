'use server'

import {cookies, headers} from 'next/headers'
import {getJWTExpiration, LitusOAuthRefresh} from '@/utils/oauth';
import {redirect} from 'next/navigation';
import {NextResponse} from "next/server";

/**
 * Store JWT and Litus refresh token in Http-only cookies for session management
 */
export const storeOAuthTokens = async (jwt: string, refreshToken?: string) => {
    cookies().set({
        name: 'jwt',
        value: jwt,
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
    return {
        accessToken: responseData.access_token,
        refreshToken: responseData.refresh_token,
    };
}