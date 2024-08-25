import { NextResponse } from 'next/server';
import { getJWTExpiration } from "@/utils/oauth";

export const AddOAuthCookies = (response : NextResponse, jwt: string, refreshToken?: string) => {
    const expirationTime = getJWTExpiration(jwt);

    if (!expirationTime) {
        return NextResponse.json({ error: 'JWT token is missing expiration time' }, { status: 400 });
    }

    // Set JWT http-only cookie
    response.cookies.set({
        name: 'jwt',
        value: jwt,
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
    });

    // Set JWT expiration time http-only cookie
    // Stored separately so we don't have to do the decoding at every request to check if the JWT is expired
    response.cookies.set({
        name: 'jwt_expiration',
        value: expirationTime.toString(), // Store the JWT expiration Unix timestamp as a string
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
    });

    // Set Litus refresh token http-only cookie
    if (refreshToken) {
        response.cookies.set({
            name: 'litus_refresh',
            value: refreshToken,
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
        });
    }

    return response;
}

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

    return AddOAuthCookies(
        NextResponse.json({ success: true }),
        jwt,
        refreshToken
    );
}
