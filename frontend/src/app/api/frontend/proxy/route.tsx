import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

/**
 * Proxy for outgoing request which retrieves the JWT token from http-only cookie and sets it as bearer token in the
 * authorization header before executing the request.
 */
export async function POST(req: NextRequest) {
    try {
        const { method, url, body, headers: customHeaders } = await req.json();

        const jwt = req.cookies.get('jwt')?.value;
        if (!jwt) {
            return NextResponse.json({ error: 'Unauthorized: No JWT token found' }, { status: 401 });
        }

        const headers = {
            ...customHeaders,
            Authorization: `Bearer ${jwt}`,
        };

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
