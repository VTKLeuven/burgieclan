import axios from "axios";
import {cookies} from "next/headers";

export async function LitusOAuthCallback(req: Request) {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const storedState = cookies().get('oauth_state')?.value;

    // Verify state to prevent CSRF attacks
    // if (state !== storedState) {
    //     return new Response('State mismatch: potential CSRF attack.', { status: 400 });
    // }

    const codeVerifier = cookies().get('code_verifier')?.value;
    if (!codeVerifier) {
        return new Response('Code verifier is missing.', { status: 400 });
    }

    const tokenUrl = process.env.NEXT_PUBLIC_LITUS_OAUTH_TOKEN;
    const clientId = process.env.NEXT_PUBLIC_LITUS_API_KEY;
    const redirectUri = process.env.NEXT_PUBLIC_REDIRECT_URL;
    const backendAuthUrl = process.env.NEXT_PUBLIC_BACKEND_AUTH;

    if (!tokenUrl || !clientId || !redirectUri || !backendAuthUrl) {
        throw new Error('Missing environment variables for OAuth flow');
    }

    try {
        const tokenResponse = await axios.post(tokenUrl, {
            grant_type: 'authorization_code',
            code,
            client_id: clientId,
            redirect_uri: redirectUri,
            code_verifier: codeVerifier,
        }, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const { access_token } = tokenResponse.data;

        const jwtResponse = await axios.post(backendAuthUrl, { access_token });

        const jwt = jwtResponse.data.jwt;

        // Set the JWT in a cookie
        const headers = new Headers();
        headers.append('Set-Cookie', `jwt=${jwt}; Path=/; HttpOnly; Secure`);

        // Redirect to the homepage
        headers.append('Location', '/');
        return new Response(null, { status: 302, headers });

    } catch (error) {
        console.error('Error during token exchange:', error);
        return new Response('Authentication failed', { status: 500 });
    }
}