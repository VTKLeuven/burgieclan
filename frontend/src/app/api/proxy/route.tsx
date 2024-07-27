import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

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

        const config = {
            method,
            url,
            headers,
            data: body,
        };

        const response = await axios(config);

        return NextResponse.json(response.data);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
