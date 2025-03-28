'use server'

import { redirect } from "next/navigation";
import { headers } from 'next/headers';
import { getActiveJWT } from "@/utils/dal";
import type { ErrorResponse } from "@/types/error";

/**
 * Encodes an API error response from the backend server into a structured serializable format for the frontend.
 */
const handleError = async (response: Response): Promise<ErrorResponse> => {
    const errorData = await response.json();

    // Get the error message with priority order
    const errorMessage =
        errorData.detail ||
        errorData['hydra:description'] ||
        errorData.message ||
        errorData['hydra:title'] ||
        errorData.title
        '';

    // Use status from the error object if available, otherwise use response status
    const status = errorData.status || response.status || 500;

    switch (status) {
        case 404:
            return {
                status: 404,
                generalMessage: 'Resource not found.',
                detailedMessage: errorMessage,
                stackTrace: Array.isArray(errorData.trace) ? JSON.stringify(errorData.trace) : '',
            };
        case 500:
            return {
                status: 500,
                generalMessage: 'Internal Server Error. Please try again later.',
                detailedMessage: errorMessage,
                stackTrace: Array.isArray(errorData.trace) ? JSON.stringify(errorData.trace) : '',
            };
        default:
            return {
                status,
                generalMessage: 'Unexpected Error.',
                detailedMessage: errorMessage,
                stackTrace: Array.isArray(errorData.trace) ? JSON.stringify(errorData.trace) : '',
            };
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
        // If body is FormData, don't set content-type (useful for file uploads)
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

        // Handle successful response
        if (response.ok) {
            return response.json();
        }

        // Handle errors (except 401s)
        if (!(response.status === 401)) {
            const error = await handleError(response);
            return { error };
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
}