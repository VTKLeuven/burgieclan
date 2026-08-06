'use server'

import { getActiveJWT, logOut } from "@/actions/auth";
import { headers } from 'next/headers';
import { redirect } from "next/navigation";

/**
 * Encodes an API error response from the backend server into a structured serializable format for the frontend.
 */
const handleError = async (response: Response) => {
    // Not every error reaches us as JSON: nginx serves an HTML page for 413/502, and PHP
    // emits a plain-text warning when a request body exceeds post_max_size. Parsing those
    // as JSON throws, which used to collapse the real status into a generic 500 and hide
    // the cause from the user entirely.
    let errorData: { message?: string; title?: string; detail?: string } = {};
    try {
        errorData = await response.json();
    } catch {
        errorData = { detail: `${response.status} ${response.statusText}`.trim() };
    }

    switch (response.status) {
        case 401:
            return { error: { message: errorData.message || errorData.title || 'Unauthorized. Please log in again.', detail: errorData.detail, status: 401 } };
        case 404:
            return { error: { message: errorData.message || errorData.title || 'Resource not found.', detail: errorData.detail, status: 404 } };
        case 500:
            return { error: { message: errorData.message || errorData.title || 'Internal Server Error. Please try again later.', detail: errorData.detail, status: 500 } };
        default:
            return { error: { message: errorData.message || errorData.title || 'Unexpected Error.', detail: errorData.detail, status: response.status || 500 } };
    }
};

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

        const url = backendBaseUrl + endpoint;

        const jwt = await getActiveJWT();

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
            return await response.json();
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