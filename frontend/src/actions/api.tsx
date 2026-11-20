'use server'

import { logOut } from "@/actions/auth";
import { getActiveJWT } from "@/lib/auth.server";
import {
    backendUrl,
    handleError,
    readSharedAnnouncement,
    usesSharedAnnouncementCache as sharesAnnouncements,
    writeSharedAnnouncement,
} from "@/lib/backendApi.server";
import { headers } from 'next/headers';
import { redirect } from "next/navigation";

/**
 * API Client for authenticated or unauthenticated requests to the backend server.
 * - Includes JWT if available and attempts automatic refresh if expired
 * - Redirects to login page if 401 error is returned (JWT not available or expired and not refreshable)
 * - Propagates errors in structured format to calling component
 */
export const ApiClient = async (method: string, endpoint: string, body?: unknown, customHeaders?: Headers) => {
    const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const frontendBaseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL;

    try {
        if (!backendBaseUrl || !frontendBaseUrl) {
            return { error: { message: 'Unexpected API Error.', status: 500 } };
        }

        const url = backendUrl(endpoint);
        if (!url) {
            return { error: { message: 'Invalid API endpoint.', status: 400 } };
        }

        const jwt = await getActiveJWT();
        const usesSharedAnnouncementCache = sharesAnnouncements(method, endpoint, jwt);

        if (usesSharedAnnouncementCache) {
            const cached = readSharedAnnouncement(endpoint);
            if (cached !== undefined) return cached;
        }

        const requestHeaders = new Headers(customHeaders || {});
        // If body is FormData, don't set content-type (useful for file uploads)
        if (!(body instanceof FormData) && !customHeaders?.get('Content-Type')) {
            if (method === 'PATCH') {
                // Backend expects content-type to be application/merge-patch+json for PATCH requests
                requestHeaders.set('Content-Type', 'application/merge-patch+json');
            } else if (method === 'POST') {
                // Backend expects content-type to be application/ld+json for POST requests
                requestHeaders.set('Content-Type', 'application/ld+json');
            } else {
                // Set default content type to application/json if not specified
                requestHeaders.set('Content-Type', 'application/json');
            }
        }

        if (jwt) {
            requestHeaders.set('Authorization', `Bearer ${jwt}`);
        }

        const response = await fetch(url, {
            method,
            headers: requestHeaders,
            // If body is FormData, send it as is, otherwise stringify it (again, useful for file uploads)
            body: body instanceof FormData ? body : JSON.stringify(body),
        });

        // Handle successful response
        if (response.ok) {
            if (response.status === 204) {
                return null; // No content response
            }
            const result = await response.json();
            if (usesSharedAnnouncementCache) {
                writeSharedAnnouncement(endpoint, result);
            }
            return result;
        }

        // Handle 401 errors (except for login endpoint)
        if (response.status === 401 && endpoint !== '/api/auth/login') {
            // This throws a special error that will exit the function and trigger the redirect
            // Important: This needs to be a throw so execution stops immediately
            throw new Error('REDIRECT_TO_LOGIN');
        }

        // Handle all other errors
        return await handleError(response);

    } catch (error: unknown) {
        // Special case for login redirection
        if (error instanceof Error && error.message === 'REDIRECT_TO_LOGIN') {
            // Ensure we exit the function properly with this redirect
            await redirectToLogin(frontendBaseUrl!);
        }

        // Handle all other errors
        const message = error instanceof Error ? error.message : 'Unexpected API Error.';
        return { error: { message, status: 500 } };
    }
}

// Separate function to handle the redirect logic
async function redirectToLogin(frontendBaseUrl: string) {
    const headersList = await headers();
    const refererUrl = headersList.get('referer') || "";
    const loginUrl = `${frontendBaseUrl}/login`;

    await logOut(); // Clear any existing session (e.g., cookies, to prevent infinite redirect loop)

    let targetPath = "";
    if (refererUrl) {
        try {
            const parsedReferer = new URL(refererUrl);
            const path = parsedReferer.pathname + parsedReferer.search + parsedReferer.hash;
            if (!path.endsWith('/login') && !path.includes('/auth/callback')) {
                targetPath = path;
            }
        } catch {
            // Invalid referer URL, ignore
        }
    }

    const redirectTo = targetPath ? `?redirectTo=${encodeURIComponent(targetPath)}` : "";
    const finalLoginUrl = `${loginUrl}${redirectTo}`;
    redirect(finalLoginUrl);
}
