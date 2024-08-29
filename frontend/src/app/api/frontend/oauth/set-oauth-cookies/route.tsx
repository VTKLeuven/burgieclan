import { NextResponse } from 'next/server';
import {addOAuthCookiesToResponse} from "@/utils/oauth";

/**
 * Stores the JWT, JWT expiration timestamp and Litus refresh token in http-only cookies. Make sure the response is
 * sent to a client-side component for the cookies to be stored in the browser.
 *
 * This is done by an API endpoint because at the time of writing, cookies can only be written in a Route Handler (this
 * case) or a Server Action. Client-side components can't access http-only cookies.
 */
export async function POST(request: Request) {
    const { jwt, refreshToken } = await request.json();

    if (!jwt) {
        return NextResponse.json({ error: 'JWT or refresh token missing in request body' }, { status: 400 });
    }

    return addOAuthCookiesToResponse(
        NextResponse.json({ success: true }),
        jwt,
        refreshToken
    );
}
