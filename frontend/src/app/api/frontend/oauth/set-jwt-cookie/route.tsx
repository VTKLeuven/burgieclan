import { NextResponse } from 'next/server';

/**
 * Receives a JWT and stores it in a http-only cookie to create a session.
 *
 * This is done by an API endpoint because at the time of writing, cookies can only be written in a Route Handler (this
 * case) or a Server Action.
 */
export async function POST(request: Request) {
    const { jwt } = await request.json();

    if (!jwt) {
        return NextResponse.json({ error: 'JWT token missing in request body' }, { status: 400 });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set({
        name: 'jwt',
        value: jwt,
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
    });

    return response;
}
