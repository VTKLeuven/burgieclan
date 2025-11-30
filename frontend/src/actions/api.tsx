'use server'

import { getActiveJWT, logOut } from "@/actions/auth";
import { COOKIE_NAMES } from "@/utils/cookieNames";
import { cookies, headers } from 'next/headers';
import { redirect } from "next/navigation";

/**
 * Encodes an API error response from the backend server into a structured serializable format for the frontend.
 */
const handleError = async (response: Response) => {
    const errorData = await response.json();

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
 * Builds request headers with appropriate content-type and authorization
 */
const buildRequestHeaders = (method: string, body?: any, customHeaders?: Headers, jwt?: string | null) => {
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

    return requestHeaders;
};

/**
 * API Client for authenticated or unauthenticated requests to the backend server.
 * - Includes JWT if available and attempts automatic refresh if expired
 * - Redirects to login page if 401 error is returned (JWT not available or expired and not refreshable)
 * - Propagates errors in structured format to calling component
 */
export const ApiClient = async (method: string, endpoint: string, body?: any, customHeaders?: Headers) => {
    const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const frontendBaseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL;

    try {
        if (!backendBaseUrl || !frontendBaseUrl) {
            return { error: { message: 'Unexpected API Error.', status: 500 } };
        }

        const url = backendBaseUrl + endpoint;

        const jwt = await getActiveJWT();
        const requestHeaders = buildRequestHeaders(method, body, customHeaders, jwt);

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
            const errorData = await response.json();

            // Check if this is an "Invalid JWT" error that can be handled by token refresh
            if (errorData.detail === "Invalid JWT, please login again to get a new one.") {
                // Clear the invalid JWT cookie and try to refresh using the refresh token
                const cookieStore = await cookies();
                cookieStore.delete(COOKIE_NAMES.JWT);

                // Try to get a new JWT using the refresh token
                const newJwt = await getActiveJWT();

                if (newJwt) {
                    // Token refresh succeeded, retry the request with the new JWT
                    const retryHeaders = buildRequestHeaders(method, body, customHeaders, newJwt);

                    const retryResponse = await fetch(url, {
                        method,
                        headers: retryHeaders,
                        body: body instanceof FormData ? body : JSON.stringify(body),
                    });

                    // Handle successful retry response
                    if (retryResponse.ok) {
                        if (retryResponse.status === 204) {
                            return null; // No content response
                        }
                        return await retryResponse.json();
                    }

                    // If retry also fails, fall through to normal error handling
                    return await handleError(retryResponse);
                }
            }

            // Token refresh failed or this wasn't an Invalid JWT error, redirect to login
            // This throws a special error that will exit the function and trigger the redirect
            // Important: This needs to be a throw so execution stops immediately
            throw new Error('REDIRECT_TO_LOGIN');
        }

        // Handle all other errors
        return await handleError(response);

    } catch (error: any) {
        // Special case for login redirection
        if (error.message === 'REDIRECT_TO_LOGIN') {
            // Ensure we exit the function properly with this redirect
            await redirectToLogin(frontendBaseUrl!);
        }

        // Handle all other errors
        return { error: { message: error.message || 'Unexpected API Error.', status: 500 } };
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