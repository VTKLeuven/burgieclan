import {NextRequest, NextResponse} from 'next/server';
import {LitusOAuthRefresh} from "@/utils/oauth";

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
        const jwtExpiration = req.cookies.get('jwt_expiration')?.value; // In milliseconds

        const headers = {
            ...customHeaders,
            'Content-Type': 'application/json',
        };

        // Set the JWT token in the authorization header if present
        if (jwt) {
            if (!jwtExpiration) {
                console.error('JWT token is missing expiration time');
            }
            else {
                // Check if JWT is expired
                if (Date.now() > parseInt(jwtExpiration)) {
                    const refreshToken = req.cookies.get('litus_refresh')?.value;
                    if (!refreshToken) {
                        console.error("no refresh token found");
                    }
                    else {
                        const newJWt = await LitusOAuthRefresh(refreshToken)
                        if (newJWt) {
                            console.log("Refreshed jwt", newJWt);
                            headers['Authorization'] = `Bearer ${newJWt}`;
                        } else {
                            console.error("Failed to refresh token");
                        }
                    }
                }
                else {
                    headers['Authorization'] = `Bearer ${jwt}`;
                }
            }
        }

        console.log("exit");

        // Make request to the actual backend
        const res = await fetch(url, {
            method,
            headers,
            body: JSON.stringify(body),
        });

        const data = await res.json();

        console.log(data);

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