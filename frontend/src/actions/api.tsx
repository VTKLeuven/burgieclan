'use server'

import { redirect } from "next/navigation";
import { headers } from 'next/headers';
import { getActiveJWT } from "@/utils/dal";

/**
 * Encodes an API error response from the backend server into a structured serializable format for the frontend.
 */
const handleError = async (response: Response) => {
    const errorData = await response.json();

    switch (response.status) {
        case 404:
            return { error: { message: errorData.message || 'Resource not found.', status: 404 } };
        case 500:
            return { error: { message: errorData.message || 'Internal Server Error. Please try again later.', status: 500 } };
        default:
            return { error: { message: errorData.message || 'Unexpected Error.', status: response.status || 500 } };
    }
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

        const requestHeaders = new Headers(customHeaders || {});
        // If body is FormData, don't set content-type (usefull for file uploads)
        if (!(body instanceof FormData)) {
            if (method === 'PATCH') {
                // Backend expects content-type to be application/merge-patch+json for PATCH requests
                requestHeaders.set('Content-Type', 'application/merge-patch+json');
            } else {
                // Backend expects content-type to be application/json
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

        const res = await response.json();

        // Handle successful response
        if (response.ok) {
            return res;
        }

        // Handle errors (except 401s)
        if (!(response.status === 401)) {
            return await handleError(response);
        }

    } catch (error: any) {
        return { error: { message: error.message || 'Unexpected API Error.', status: 500 } };
    }

    // Handle 401s for login endpoint
    // This is a special case where we don't want to redirect to login page, because we are already there
    if (endpoint === '/api/auth/login') {
        throw new Error('401 Error logging in');
    }


    // Handle 401s by redirecting (must be done outside try-catch block because NextJS Redirect invoked via error)
    const headersList = headers();
    const refererUrl = headersList.get('referer') || "";
    const loginUrl = `${frontendBaseUrl}/login`;

    // Only set the redirectTo query parameter if the referer URL is not the login page
    const redirectTo = refererUrl && !refererUrl.startsWith(loginUrl) ? `?redirectTo=${encodeURIComponent(refererUrl)}` : "";
    const finalLoginUrl = `${loginUrl}${redirectTo}`;
    redirect(finalLoginUrl);

    return;
}