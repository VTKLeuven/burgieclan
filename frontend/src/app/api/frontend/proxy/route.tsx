import {NextRequest, NextResponse} from 'next/server';
import {getJWTExpiration, LitusOAuthRefresh} from "@/utils/oauth";
import {AddOAuthCookies} from "@/app/api/frontend/oauth/set-oauth-cookies/route";

/**
 * Proxy for outgoing request which retrieves the JWT token from http-only cookie and sets it as bearer token in the
 * authorization header before executing the request.
 *
 * Http-only cookies can't be accessed by client-components, which is why this server-side endpoint should be used.
 *
 * Can also be used without authentication, in that case no authorization header is set.
 */
export async function POST(req: NextRequest) {
    try {
        const { method, url, body, headers: customHeaders } = await req.json();

        let jwt = req.cookies.get('jwt')?.value || null;
        let jwtUpdated = false;

        const jwtExpirationCookie = req.cookies.get('jwt_expiration')?.value; // Unix timestamp as string
        let jwtExpiration : number;

        let refreshToken = req.cookies.get('litus_refresh')?.value;

        const headers = {
            ...customHeaders,
            'Content-Type': 'application/json',
        };

        if (jwt) {
            if (!jwtExpirationCookie) {
                jwtExpiration = getJWTExpiration(jwt);
            }
            else {
                jwtExpiration = parseInt(jwtExpirationCookie);
            }
            // Check if JWT is expired and refresh if necessary
            // Convert JWT expiration Unix timestamp to number in milliseconds and compare it to current time
            if (Date.now() > jwtExpiration * 1000) {

                if (!refreshToken) {
                    // TODO: login required (refresh token not available)
                    throw Error("No refresh token found");
                }

                // Retrieve and store new oauth tokens
                const { newJwt, newRefreshToken } = await LitusOAuthRefresh(refreshToken);

                if (!newJwt || !newRefreshToken) {
                    // TODO: login required (error occurred, possibly refresh token expired)
                    throw Error("Failed to refresh token");
                }

                jwt = newJwt;
                refreshToken = newRefreshToken;
                jwtUpdated = true;
            }
            headers['Authorization'] = `Bearer ${jwt}`;
        }

        // Make request to the actual backend
        const res = await fetch(url, {
            method,
            headers,
            body: JSON.stringify(body),
        });

        const data = await res.json();

        // Forward received status code and body from backend to client
        const response =  new NextResponse(
            JSON.stringify(data),
            {
                status: res.status,
            }
        );

        const newResponse = jwtUpdated ? AddOAuthCookies(response, jwt, refreshToken) : response

        // If tokens refreshed, set new JWT (and possibly refresh token) in http-only cookies in response to client
        return newResponse;

    } catch (error) {
        // Handle unexpected errors (e.g. network issues)
        return new NextResponse(
            // Error message body in same format as backend errors
            JSON.stringify({ title: 'API proxy error', detail: error.message }),
        {
                status: 500
            }
        );
    }
}