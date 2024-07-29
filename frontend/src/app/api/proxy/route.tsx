import {NextRequest, NextResponse} from 'next/server';

/**
 * Proxy for outgoing request which retrieves the JWT token from http-only cookie and sets it as bearer token in the
 * authorization header before executing the request.
 *
 * Can also be used without authentication, in that case no authorization header is set.
 */
export async function POST(req: NextRequest) {
    try {
        const { method, url, body, headers: customHeaders } = await req.json();

        const jwt = req.cookies.get('jwt')?.value;

        const headers = {
            ...customHeaders,
        };

        // proxy should continue even if no jwt is present
        if (jwt) {
            headers['Authorization'] = `Bearer ${jwt}`;
        }

        const res =  await fetch(url, {
            method,
            headers,
            body: JSON.stringify(body),
        });

        const data = await res.json();

        if (!res.ok) {
            return NextResponse.json({ error: data });
        }

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: { message: error.message || 'An error occurred', status: 500 } });
    }
}
