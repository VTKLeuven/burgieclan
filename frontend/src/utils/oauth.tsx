'use client'

import crypto from "crypto";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import {useRouter, useSearchParams} from "next/navigation";
import {useEffect, useRef} from "react";
import axios from "axios";

/**
 * Encode binary buffer to base64url
 */
function base64URLEncode(buffer : crypto.BinaryLike) {
    // @ts-ignore
    return buffer.toString("base64")
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

/**
 * Hash binary buffer with SHA256
 */
function sha256(buffer: crypto.BinaryLike) {
    return crypto.createHash('sha256').update(buffer).digest();
}

/**
 * Generate unguessable code verifier (following PCKE for OAuth, see RFC7636)
 */
const generateCodeVerifier = () => {
    return base64URLEncode(crypto.randomBytes(32));
};

/**
 * Generate code challenge which is to be verified later (following PCKE for OAuth, see RFC7636)
 */
const generateCodeChallenge = (codeVerifier: string) => {
    return base64URLEncode(sha256(codeVerifier));
};

/**
 * Redirects the user to Litus where he should authenticate himself, after which the Litus authentication server
 * redirects back to the callback url
 */
export const initiateLitusOAuthFlow = (router: AppRouterInstance) => {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    sessionStorage.setItem('code_verifier', codeVerifier);

    // store for later use
    const state = crypto.randomBytes(16).toString('hex');

    // store for later verification of received state
    sessionStorage.setItem('state', state);

    const authorizationUri = process.env.NEXT_PUBLIC_LITUS_OAUTH_AUTHORIZE;
    const clientId = process.env.NEXT_PUBLIC_LITUS_API_KEY;
    const frontendUri = process.env.NEXT_PUBLIC_FRONTEND_URL

    if (!authorizationUri || !clientId || !frontendUri) {
        throw new Error("Error during Litus authorization redirect: missing environment variables for OAuth flow");
    }

    const redirectUri = frontendUri + "/oauth/callback"

    const params = new URLSearchParams({
        scope: 'openid profile email',
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        state: state,
    });
    const authUrl = `${authorizationUri}?${params.toString()}`;

    router.push(authUrl);
}

/**
 * Request authorization code and provide PCKE code and code verifier to authentication server
 */
const exchangeAuthorizationCode = async (code: string, codeVerifier: string) => {
    // Proxy access-token retrieval through backend to avoid CORS issues
    const frontendApiUri = process.env.NEXT_PUBLIC_FRONTEND_API_URL;
    const clientId = process.env.NEXT_PUBLIC_LITUS_API_KEY;
    const frontendUri = process.env.NEXT_PUBLIC_FRONTEND_URL

    if (!frontendApiUri || !clientId || !frontendUri) {
        throw new Error("Error during authorization code exchange: missing environment variables for OAuth flow");
    }

    const redirectUri = frontendUri + "/oauth/callback"
    const tokenProxyUri = frontendApiUri + "/api/frontend/oauth/exchange-access-token"

    const response = await axios.post(tokenProxyUri, {
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
    });

    return response.data.access_token;
};

/**
 * Retrieve JWT from access token via backend endpoint
 */
const exchangeAccessTokenForJWT = async (accessToken: string) => {
    const backendAuthUrl = process.env.NEXT_PUBLIC_BURGIECLAN_BACKEND_AUTH;

    if (!backendAuthUrl) {
        throw new Error("Error during JWT exchange: missing environment variables for OAuth flow");
    }

    const response = await axios.post(backendAuthUrl, {
        accessToken: accessToken
    }, {
        headers: {
            'accept': 'application/ld+json',
            'Content-Type': 'application/ld+json'
        }
    });

    return response.data.token;
};

/**
 * Set JWT as http-only cookie for session management
 */
export const SetJWTAsCookie = async (jwt: string): null => {
    const frontendApiUrl = process.env.NEXT_PUBLIC_FRONTEND_API_URL

    if (!frontendApiUrl) {
        throw new Error("Error during setting JWT cookie: missing environment variables for OAuth flow");
    }

    const setCookieUrl = frontendApiUrl + "/api/frontend/oauth/set-jwt-cookie"

    // Put JWT in Http-only cookie for session management
    await axios.post(setCookieUrl, {jwt});
}

/**
 * Provides functionality for callback url, where the Litus authentication server redirects to after successful user
 * login. Retrieves access token and JWT and sets it as cookie for future requests.
 */
export const LitusOAuthCallback = (): null => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const hasRun = useRef(false);

    useEffect(() => {
        if (hasRun.current) return;
        hasRun.current = true;

        const code = searchParams.get('code');
        const codeVerifier = sessionStorage.getItem('code_verifier');

        if (!codeVerifier) {
            console.error('Code verifier is missing.');
            return;
        }

        const state = searchParams.get('state');
        const storedState = sessionStorage.getItem('state');

        if (state !== storedState) {
            console.error('State mismatch: potential CSRF attack.', { status: 400 });
            return;
        }

        if (code && codeVerifier) {
            (async () => {
                try {
                    const accessToken = await exchangeAuthorizationCode(code, codeVerifier);
                    const jwt = await exchangeAccessTokenForJWT(accessToken);

                    await SetJWTAsCookie(jwt);

                    router.push('/');
                } catch (error) {
                    console.error('Error during token exchange:', error);
                }
            })();
        }
    }, [searchParams, router]);

    return null;
};

/**
 * Check the presence of a JWT in http-only cookie
 */
export const hasJwt = async (): Promise<boolean> => {
    const response = await axios.post('/api/frontend/oauth/has-jwt');
    return response.data.isAuthenticated;
}