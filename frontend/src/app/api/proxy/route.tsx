import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req: NextRequest) {
    try {
        const { method, url, body } = await req.json();

        // Extract the auth token from cookies
        const jwt = req.cookies.get('jwt')?.value;

        console.log(jwt);

        if (!jwt) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Create Axios config
        const config = {
            method,
            url,
            headers: {
                Authorization: `Bearer ${jwt}`,
                'Content-Type': 'application/json',
            },
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
