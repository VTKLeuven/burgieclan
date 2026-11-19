'use server'

import { clearTokenCookies, persistTokenCookies } from '@/lib/auth.server';
import { COOKIE_NAMES } from '@/utils/cookieNames';
import { captureException } from '@sentry/nextjs';
import { cookies } from 'next/headers';

/**
 * Store authentication tokens in HTTP-only cookies.
 */
export const storeTokensInCookies = async (
    jwt: string,
    refreshToken?: string,
    refreshTokenExpiration?: number
) => {
    await persistTokenCookies(jwt, refreshToken, refreshTokenExpiration);
};

/**
 * Log out user by calling the backend logout endpoint and clearing all authentication tokens
 */
export const logOut = async (): Promise<{ success: boolean; error?: string }> => {
    try {
        const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        if (!backendBaseUrl) {
            throw new Error('Missing environment variable for backend base URL');
        }

        // Get the current JWT and refresh token for the logout request
        const cookieStore = await cookies();
        const jwt = cookieStore.get(COOKIE_NAMES.JWT)?.value;
        const refreshToken = cookieStore.get(COOKIE_NAMES.REFRESH_TOKEN)?.value;

        // Call the backend logout endpoint if we have a JWT
        if (jwt) {
            const response = await fetch(`${backendBaseUrl}/api/auth/logout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/ld+json',
                    'Authorization': `Bearer ${jwt}`
                },
                body: JSON.stringify({
                    refresh_token: refreshToken
                }),
            });

            // Log any issues but don't fail the logout process
            if (!response.ok) {
                console.warn('Backend logout failed:', response.status, await response.text());
            }
        }

        // Always clear the local cookies regardless of backend response
        await clearTokenCookies();

        return { success: true };
    } catch (error) {
        captureException(
            error instanceof Error ? error : new Error(String(error)),
            { extra: { context: "Logout error" } }
        );

        // Even if the backend call fails, still clear local cookies
        await clearTokenCookies();

        return { success: false, error: 'Logout completed but with errors' };
    }
};
