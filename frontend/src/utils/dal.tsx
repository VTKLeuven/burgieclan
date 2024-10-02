'use server';

import {cookies} from "next/headers";
import {getJWTExpiration, LitusOAuthRefresh} from "@/utils/oauth";

export const getActiveJWT = async () => {
    const cookieStore = cookies();

    let jwt = cookieStore.get('jwt')?.value || null;
    let refreshToken = cookieStore.get('litus_refresh')?.value;

    if (jwt) {
        // Retrieve JWT expiration timestamp
        const jwtExpiration = getJWTExpiration(jwt);

        // Check if JWT is expired and refresh if necessary
        if (Date.now() > jwtExpiration * 1000) {
            // If no refresh token is available, redirect to login page
            if (!refreshToken) {
                return null;
            }

            // Refresh OAuth tokens
            const { newJwt, newRefreshToken } = await LitusOAuthRefresh(refreshToken);

            // If refresh failed (e.g. refresh token expired), redirect to login page
            if (!newJwt || !newRefreshToken) {
                return null;
            }

            return newJwt;
        }

        return jwt;
    }

    return null;
}