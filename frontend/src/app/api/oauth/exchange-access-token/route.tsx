import { NextResponse } from 'next/server';
import axios from 'axios';

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