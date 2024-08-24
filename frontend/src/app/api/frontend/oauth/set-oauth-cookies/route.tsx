import { NextResponse } from 'next/server';
import { parseJWT } from "@/utils/oauth";

/**
 * Stores the JWT, JWT expiration timestamp and Litus refresh token in http-only cookies.
 *
 * This is done by an API endpoint because at the time of writing, cookies can only be written in a Route Handler (this
 * case) or a Server Action. Client-side components can't access http-only cookies.
 */
export async function POST(request: Request) {
    const { jwt, refreshToken } = await request.json();

    if (!jwt) {
        return NextResponse.json({ error: 'JWT or refresh token missing in request body' }, { status: 400 });
    }

    // Parse expiration time of JWT
    const parsedJWT = parseJWT(jwt);
    const expirationTime = parsedJWT?.exp;

    if (!expirationTime) {
        return NextResponse.json({ error: 'JWT token is missing expiration time' }, { status: 400 });
    }

    const response = NextResponse.json({ success: true });

    // Set JWT http-only cookie
    response.cookies.set({
        name: 'jwt',
        value: jwt,
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
    });

    // Set JWT expiration time cookie
    response.cookies.set({
        name: 'jwt_expiration',
        value: expirationTime.toString(), // Store the expiration time (Unix epoch) as a string
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
    });

    // Set Litus refresh token
    if (refreshToken) {
        response.cookies.set({
            name: 'litus_refresh',
            value: refreshToken, // Store the expiration time (Unix epoch) as a string
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
        });
    }

    return response;
}
