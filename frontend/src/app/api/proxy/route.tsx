import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req: NextRequest) {
    try {
        const { method, url, body, headers: customHeaders } = await req.json();

        // Extract the auth token from cookies
        const jwt = req.cookies.get('jwt')?.value;

        if (!jwt) {
            return NextResponse.json({ error: 'Unauthorized: No JWT token found' }, { status: 401 });
        }

        // Merge the custom headers with the Authorization header
        const headers = {
            ...customHeaders,
            Authorization: `Bearer ${jwt}`,
        };

        // Create Axios config
        const config = {
            method,
            url,
            headers,
            data: body,
        };

        // Make the API request with the bearer token
        const response = await axios(config);

        // Return the data from the API
        return NextResponse.json(response.data);
    } catch (error) {
        // @ts-ignore
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
