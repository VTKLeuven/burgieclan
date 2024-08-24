import { NextResponse } from 'next/server';
import axios from 'axios';

/**
 * Passes a body to the Litus token endpoint.
 *
 * This is done by an API endpoint which executes on the server-side, to avoid CORS issues taking place when calling
 * the Litus endpoint directly from the frontend.
 */
export async function POST(req: Request) {
    const body = await req.json();

    console.log("Litus token proxy");

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