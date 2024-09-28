'use server'

import {proxyRequest} from "@/actions/oauth";

/**
 * Encodes an API error response from the backend server into a structured serializable format for the frontend.
 */
const handleError = async (response: Response) => {
    const errorData = await response.json();

    switch (response.status) {
        case 401:
            return { error: { message: errorData.message || 'Unauthorized access. Please log in.', status: 401 } };
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
 *
 * Two types of errors are handled:
 * - Network or other unexpected errors
 * - Backend error response messages
 * Both are encoded in a structured serializable format for easy handling in the calling component.
 */
export const ApiClient = async (method: string, endpoint: string, body?: any, headers?: Headers) => {
    try {
        const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        const frontendBaseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL;

        if (!backendBaseUrl || !frontendBaseUrl) {
            throw new Error(`Missing environment variable for backend or frontend base URL`)
        }

        const url = backendBaseUrl + endpoint;

        const response = await proxyRequest(method, url, body, headers);

        // Handle successful response
        if (!response.ok) {
            return await handleError(response);
        }

        return response.json();

    } catch (error: any) {
        return { error: { message: error.message || 'Unexpected API Error.', status: 500 } };
    }
}