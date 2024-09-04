'use server'

import {proxyRequest} from "@/actions/oauth";

const handleError = async (response: Response) => {
    const errorData = await response.json();

    switch (response.status) {
        case 401:
            return { error: {message: errorData.message || 'Unauthorized access. Please log in.', status: 401 } };
        case 404:
            return { error: {message: errorData.message || 'Resource not found.', status: 404 } };
        case 500:
            return { error: {message: errorData.message || 'Internal Server Error. Please try again later.', status: 500 } };
        default:
            return { error: {message: errorData.message || 'Unauthorized access. Please log in.', status: response.status } };
    }
};

/**
 * API Client for authenticated or unauthenticated requests to the backend server.
 *
 * Two types of errors are handled:
 * - Network or other unexpected errors
 * - Backend error response messages
 * Both are encoded in the ApiClientError type for easy handling in the calling component.
 */
export const ApiClient = async (method: string, endpoint: string, body?: any, headers?: Headers) => {
    const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const frontendBaseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL;

    if (!backendBaseUrl || !frontendBaseUrl) {
        throw new Error(`Missing environment variable for backend or frontend base URL`)
    }

    const url = backendBaseUrl + endpoint;

    try {
        const response = await proxyRequest(method, url, body, headers);
        console.log(response);

        // Handle redirect
        if (response.redirected) {
            window.location.href = response.url;
            return;
        }

        // Handle successful response
        if (!response.ok) {
            return await handleError(response);
        }

        return response.json();

    } catch (error: any) {
        console.log("error caught in apiclient", error);
        throw error;
    }
}