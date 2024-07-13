import { NextResponse } from 'next/server';
import axios from 'axios';

/**
 * This POST request passes a code and code-verifier to the Litus authorization server in order to retrieve an access
 * code.
 *
 * This request is executed on the server-side, which avoids CORS issues taking place when calling the Litus endpoint
 * directly from the frontend.
 *
 * @param req
 * @constructor
 */
export async function POST(req: Request) {
    const body = await req.json();

    try {
        const response = await axios.post(process.env.NEXT_PUBLIC_LITUS_OAUTH_TOKEN!, body, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        return NextResponse.json(response.data);
    } catch (error) {
        console.error('Error during token exchange:', error);
        return NextResponse.error();
    }
}