'use server'

import { cookies } from 'next/headers'
import {NextResponse} from "next/server";
import {getJWTExpiration} from "@/utils/oauth";

/**
 * Store JWT and Litus refresh token in Http-only cookies for session management
 */
export const storeOAuthTokens = async (jwt: string, refreshToken?: string) => {
    const expirationTime = getJWTExpiration(jwt);

    if (!expirationTime) {
        throw Error('JWT token is missing expiration time');
    }

    cookies().set({
        name: 'jwt',
        value: jwt,
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
    })

    // Set JWT expiration time http-only cookie
    // Stored separately so we don't have to do the decoding at every request to check if the JWT is expired
    cookies().set({
        name: 'jwt_expiration',
        value: expirationTime.toString(), // Store the JWT expiration Unix timestamp as a string
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
    })

    // Set Litus refresh token http-only cookie
    if (refreshToken) {
        cookies().set({
            name: 'litus_refresh',
            value: refreshToken,
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
        })
    }
}