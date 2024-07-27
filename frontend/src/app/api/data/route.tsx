// app/api/data/route.ts
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(req: NextRequest) {
    try {
        // Extract the auth token from cookies
        const jwt = req.cookies.get('jwt')?.value;

        if (!jwt) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Make the API request with the bearer token
        const response = await axios.get(process.env.NEXT_PUBLIC_BACKEND_URL + "/api/users/1", {
            headers: {
                Authorization: `Bearer ${jwt}`,
            },
        });

        // Return the data from the API
        return NextResponse.json(response.data);
    } catch (error) {
        // @ts-ignore
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
