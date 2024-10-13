import 'server-only'

/**
 * DAL (Data Access Layer) centralizes authentication logic
 * https://nextjs.org/docs/app/building-your-application/authentication#creating-a-data-access-layer-dal
 */

import { cookies } from "next/headers";
import {getJWTExpiration, LitusOAuthRefresh, parseJWT} from "@/utils/oauth";
import {cache} from "react";

export const isAuth = cache(async () => {
    const jwt = await getActiveJWT();
    if (jwt) {
        console.log(parseJWT(jwt));
    }
    return jwt != null;
})

/**
 * Returns JWT if available, refreshes it first if expired, returns null if not available or not refreshable
 */
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