// app/utils/apiClient.ts
export const apiClient = async (method: string, endpoint: string, body?: any, headers?: Record<string, string>) => {
    const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

    if (!baseUrl) {
        throw new Error(`Missing environment variable for backend base URL`)
    }

    const url = baseUrl + endpoint;

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