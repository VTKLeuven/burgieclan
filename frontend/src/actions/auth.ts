'use server'

import { getUserIdFromJWT, isJWTExpired } from '@/utils/jwt';
import { cookies } from 'next/headers';

/**
 * Server-side function to get the current user ID from JWT stored in HTTP-only cookie
 * This function can only be called in Server Components or Server Actions
 */
export const getUserId = async (): Promise<number | null> => {
    const cookieStore = cookies();
    const jwt = cookieStore.get('jwt')?.value;

    if (!jwt) {
        return null;
    }

    // Check if JWT is expired
    if (isJWTExpired(jwt)) {
        // Could implement refresh logic here in the future
        return null;
    }

    return getUserIdFromJWT(jwt);
};

/**
 * Server-side function to check if user is authenticated
 */
export const isAuthenticated = async (): Promise<boolean> => {
    const userId = await getUserId();
    return userId !== null;
};

/**
 * Server-side function to get the JWT token from HTTP-only cookie
 */
export const getServerJWT = async (): Promise<string | null> => {
    const cookieStore = cookies();
    const jwt = cookieStore.get('jwt')?.value;

    if (!jwt) {
        return null;
    }

    // Check if JWT is expired
    if (isJWTExpired(jwt)) {
        return null;
    }

    return jwt;
};

/**
 * Server-side function to get an active JWT, refreshing if necessary
 * This function handles automatic token refresh using the refresh token
 */
export const getActiveJWT = async (): Promise<string | null> => {
    const cookieStore = cookies();
    let jwt = cookieStore.get('jwt')?.value;
    const refreshToken = cookieStore.get('refresh_token')?.value;

    // If no JWT at all, return null
    if (!jwt) {
        return null;
    }

    // If JWT is not expired, return it
    if (!isJWTExpired(jwt)) {
        return jwt;
    }

    // JWT is expired, try to refresh if we have a refresh token
    if (!refreshToken) {
        return null;
    }

    try {
        // Call the refresh endpoint
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
            const newJwt = data.token;
            const newRefreshToken = data.refresh_token;
            const refreshTokenExpiration = data.refresh_token_expiration; // Unix timestamp
            await storeTokensInCookies(newJwt, newRefreshToken, refreshTokenExpiration);
            return newJwt;
        } else {
            console.error('Token refresh failed with status:', response.status, 'Response:', await response.text());
            // Refresh failed, clear the tokens
            await clearTokenCookies();
            return null;
        }
    } catch (error) {
        console.error('Token refresh failed:', error);
        await clearTokenCookies();
        return null;
    }
};

/**
 * Helper function to store tokens in HTTP-only cookies
 */
export const storeTokensInCookies = async (
    jwt: string,
    refreshToken?: string,
    refreshTokenExpiration?: number
) => {
    const cookieStore = cookies();

    // Calculate JWT expiration from the token itself
    const jwtPayload = JSON.parse(atob(jwt.split('.')[1]));
    const jwtExpiration = new Date(jwtPayload.exp * 1000);

    // Set JWT cookie
    cookieStore.set({
        name: 'jwt',
        value: jwt,
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        expires: jwtExpiration,
    });

    // Set refresh token cookie if provided
    if (refreshToken) {
        const refreshExpiration = refreshTokenExpiration
            ? new Date(refreshTokenExpiration * 1000)
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default 30 days fallback

        cookieStore.set({
            name: 'refresh_token',
            value: refreshToken,
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            expires: refreshExpiration,
        });
    }
};

/**
 * Clear all authentication cookies
 */
export const clearTokenCookies = async () => {
    const cookieStore = cookies();
    cookieStore.delete('jwt');
    cookieStore.delete('refresh_token');
};

/**
 * Log out user by clearing all authentication tokens
 */
export const logOut = async () => {
    await clearTokenCookies();
};