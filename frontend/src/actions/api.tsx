'use server'

import { getActiveJWT, logOut } from "@/actions/auth";
import { headers } from 'next/headers';
import { redirect } from "next/navigation";

type ApiProblemShape = { message?: string; title?: string; detail?: string };

/**
 * Encodes an API error response from the backend server into a structured serializable format for the frontend.
 * Handles non-JSON bodies (e.g. Symfony HTML error pages on 500) without throwing.
 */
const handleError = async (response: Response) => {
    const contentType = response.headers.get('content-type') ?? '';
    let errorData: ApiProblemShape = {};

    if (contentType.includes('json')) {
        try {
            errorData = (await response.json()) as ApiProblemShape;
        } catch {
            errorData = {};
        }
    } else {
        const text = await response.text();
        const snippet = text.slice(0, 400).replace(/\s+/g, ' ').trim();
        errorData = {
            detail: snippet ? `Non-JSON error body (${response.status}): ${snippet}` : `Non-JSON error response (${response.status})`,
        };
    }

    const message =
        errorData.message ||
        errorData.title ||
        (response.status === 401 ? 'Unauthorized. Please log in again.' : null) ||
        (response.status === 404 ? 'Resource not found.' : null) ||
        (response.status === 500 ? 'Internal Server Error. Please try again later.' : null) ||
        'Unexpected Error.';

    return {
        error: {
            message,
            detail: errorData.detail,
            status: response.status || 500,
        },
    };
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
        // Prefer JSON/JSON-LD error responses from API Platform instead of HTML exception pages
        if (!requestHeaders.has('Accept')) {
            requestHeaders.set('Accept', 'application/ld+json, application/json');
        }
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

    logOut(); // Clear any existing session (e.g., cookies, to prevent infinite redirect loop)

    // Only set the redirectTo query parameter if the referer URL is not the login page
    const redirectTo = refererUrl && !refererUrl.startsWith(loginUrl)
        ? `?redirectTo=${encodeURIComponent(refererUrl)}`
        : "";

    const finalLoginUrl = `${loginUrl}${redirectTo}`;
    redirect(finalLoginUrl);
}