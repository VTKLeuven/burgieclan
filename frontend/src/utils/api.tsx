export type ApiClientError = {
    message: string;
    status: string;
}

/**
 * API Client for authenticated or unauthenticated requests to the backend server.
 */
export const ApiClient = async (method: string, endpoint: string, body?: any, headers?: Record<string, string>) => {
    const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const frontendBaseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL;

    if (!backendBaseUrl || !frontendBaseUrl) {
        throw new Error(`Missing environment variable for backend or frontend base URL`)
    }

    const url = backendBaseUrl + endpoint;

    // TODO BUR-110: instead of try-catch, throw errors here and catch with higher-level generic wrapper
    try {
        const res = await fetch(frontendBaseUrl + '/api/frontend/proxy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({method, url, body, headers}),
        });

        const data = await res.json();

        if (!res.ok) {
            return { error: data.error };
        }

        return data;
    } catch (error: any) {
        return { error: { message: error.message || 'An error occurred', status: 500 } };
    }
};