/**
 * API Client for requests to the backend server.
 */
<<<<<<< Updated upstream
export const apiClient = async (method: string, endpoint: string, body?: any, headers?: Record<string, string>) => {
    const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

    if (!baseUrl) {
        throw new Error(`Missing environment variable for backend base URL`)
=======
export const ApiClient = async (method: string, endpoint: string, body?: any, headers?: Record<string, string>) => {
    const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const frontendBaseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL;

    if (!backendBaseUrl || !frontendBaseUrl) {
        throw new Error(`Missing environment variable for backend or frontend base URL`)
>>>>>>> Stashed changes
    }

    const url = baseUrl + endpoint;

    // Execute request via proxy that adds JWT
    const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ method, url, body, headers }),
    });

    if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
    }

    return response.json();
};