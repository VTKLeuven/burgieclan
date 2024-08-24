import {NextRequest, NextResponse} from 'next/server';
import {getJWTExpiration, LitusOAuthRefresh, parseJWT} from "@/utils/oauth";

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

        const jwt = req.cookies.get('jwt')?.value;
        const jwtExpirationCookie = req.cookies.get('jwt_expiration')?.value; // Unix timestamp as string
        let jwtExpiration : number;

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
                const refreshToken = req.cookies.get('litus_refresh')?.value;
                if (!refreshToken) {
                    throw Error("no refresh token found");
                }
                else {
                    // Retrieve and store new oauth tokens
                    const newJWt = await LitusOAuthRefresh(refreshToken)
                    if (newJWt) {
                        // Set new JWT in header
                        headers['Authorization'] = `Bearer ${newJWt}`;
                    } else {
                        throw Error("Failed to refresh token");
                    }
                }
            }
            else {
                headers['Authorization'] = `Bearer ${jwt}`;
            }
        }

        // Make request to the actual backend
        const res = await fetch(url, {
            method,
            headers,
            body: JSON.stringify(body),
        });

        const data = await res.json();

        // Forward the exact status code and body to the client
        return new NextResponse(
            JSON.stringify(data),
            {
                status: res.status,
            }
        );

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