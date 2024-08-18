import {NextRequest, NextResponse} from 'next/server';

/**
 * Proxy for outgoing request which retrieves the JWT token from http-only cookie and sets it as bearer token in the
 * authorization header before executing the request.
 *
 * Http-only cookies can't be accessed by client-components, which is why this server-side endpoint should be used.
 *
 * Can also be used without authentication, in that case no authorization header is set.
 */
export async function POST(req: NextRequest) {
    try {
        const { method, url, body, headers: customHeaders } = await req.json();

        const jwt = req.cookies.get('jwt')?.value;

        const headers = {
            ...customHeaders,
            'Content-Type': 'application/json',
        };

        // Set the JWT token in the authorization header if present
        if (jwt) {
            headers['Authorization'] = `Bearer ${jwt}`;
        }

        // Make request to the actual backend
        const res = await fetch(url, {
            method,
            headers,
            body: JSON.stringify(body),
        });

        const data = await res.json();

        // Forward the exact status code and body to the client
        return new NextResponse(
            JSON.stringify(data),
        {
                status: res.status,
            }
        );

    } catch (error) {
        // Handle unexpected errors (e.g. network issues)
        return new NextResponse(
            // Error message body in same format as backend errors
            JSON.stringify({ title: 'API proxy error', detail: error.message }),
        {
                status: 500
            }
        );
    }
}