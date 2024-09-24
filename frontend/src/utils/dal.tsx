/**
 * The DAL (Data Access Layer) centralizes authentication logic.
 *
 * https://nextjs.org/docs/app/building-your-application/authentication#creating-a-data-access-layer-dal
 */
'use server'

import { cookies } from 'next/headers'
import {getJWTExpiration, LitusOAuthRefresh} from "@/utils/oauth";
import { storeOAuthTokens } from "@/actions/oauth";

/**
 * Get WT token from http-only cookie, refresh if necessary (token expired) and possible (refresh token available),
 * return null otherwise.
 */
export const getJWT = async (): Promise<string | null> => {
    const cookieStore = cookies();
    let jwt = cookieStore.get('jwt')?.value || null;
    let refreshToken = cookieStore.get('litus_refresh')?.value || null;

    if (!jwt) {
        return null;
    }

    // Check if JWT is expired
    const jwtExpiration = getJWTExpiration(jwt);
    if (Date.now() > jwtExpiration * 1000) {
        console.log("DAL detected expired JWT, refreshing...");
        if (!refreshToken) {
            return null;
        }

        // Refresh JWT using refresh token
        const { newJwt, newRefreshToken } = await LitusOAuthRefresh(refreshToken);
        if (newJwt && newRefreshToken) {
            console.log("new JWT token", newJwt);
            console.log("new refresh token", newRefreshToken);
            await storeOAuthTokens(newJwt, newRefreshToken);
            return newJwt;
        }
        return null;
    }

    return jwt;
};