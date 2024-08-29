import crypto from "crypto";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { ReadonlyURLSearchParams } from "next/navigation";
import axios from "axios";
import {NextResponse} from "next/server";

interface JWTPayload {
    exp: number;
    [key: string]: any; // Allows other attributes of any type
}

/**
 * Encode binary buffer to base64url
 */
function base64URLEncode(buffer: crypto.BinaryLike) {
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
 * Make a POST request for tokens from the Litus authorization server
 */
const requestTokens = async (data: Record<string, string>) => {
    const frontendApiUri = process.env.NEXT_PUBLIC_FRONTEND_API_URL;

    if (!frontendApiUri) {
        throw new Error("Failed to make token request: FRONTEND_API_URL is not defined.");
    }

    const tokenProxyUri = `${frontendApiUri}/api/frontend/oauth/litus-token-proxy`;

    try {
        const response = await axios.post(tokenProxyUri, data);
        return {
            accessToken: response.data.access_token,
            refreshToken: response.data.refresh_token
        };
    } catch (error) {
        throw new Error(`Token request failed: ${error.response?.data?.message || error.message}`);
    }
};

/**
 * Exchange PCKE code and code verifier for access and refresh tokens from Litus authorization server
 */
export const requestLitusTokens = async (code: string, codeVerifier: string) => {
    const clientId = process.env.NEXT_PUBLIC_LITUS_API_KEY;
    const frontendUri = process.env.NEXT_PUBLIC_FRONTEND_URL;

    if (!clientId || !frontendUri) {
        throw new Error("Authorization request failed: Missing LITUS_API_KEY or FRONTEND_URL.");
    }

    const redirectUri = `${frontendUri}/oauth/callback`;

    return requestTokens({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
    });
};

/**
 * Exchange refresh token for new access and refresh tokens from Litus authorization server
 */
export const refreshLitusTokens = async (refreshToken: string) => {
    const clientId = process.env.NEXT_PUBLIC_LITUS_API_KEY;
    const frontendUri = process.env.NEXT_PUBLIC_FRONTEND_URL;

    if (!clientId || !frontendUri) {
        throw new Error("Token refresh failed: Missing LITUS_API_KEY or FRONTEND_URL.");
    }

    const redirectUri = `${frontendUri}/oauth/callback`;

    return requestTokens({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        redirect_uri: redirectUri,
    });
};

/**
 * Exchange Litus access token for JWT from backend
 */
const requestJWT = async (accessToken: string) => {
    const backendAuthUrl = process.env.NEXT_PUBLIC_BURGIECLAN_BACKEND_AUTH;

    if (!backendAuthUrl) {
        throw new Error("JWT request failed: BACKEND_AUTH_URL is not defined.");
    }

    try {
        const response = await axios.post(backendAuthUrl, { accessToken }, {
            headers: {
                'Accept': 'application/ld+json',
                'Content-Type': 'application/ld+json'
            }
        });
        return response.data.token;
    } catch (error) {
        throw new Error(`Failed to exchange access token for JWT: ${error.response?.data?.message || error.message}`);
    }
};

/**
 * Decode and parse JWT
 */
const parseJWT = (jwt: string): JWTPayload => {
    try {
        const base64Url = jwt.split('.')[1];
        const base64Str = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const decodedPayload = atob(base64Str);
        const parsedPayload = JSON.parse(decodedPayload);
        if (typeof(parsedPayload.exp) !== 'number') {
            throw new Error("Failed to parse JWT: Expiration time is missing.");
        }

        return parsedPayload;
    } catch (error) {
        throw new Error("Failed to parse JWT: Invalid token format.");
    }
};

/**
 * Returns the expiration time of a JWT as Unix timestamp
 */
export const getJWTExpiration = (jwt: string): number => {
    const parsedJWT = parseJWT(jwt);
    return parsedJWT?.exp;
};

/**
 * Store JWT and Litus refresh token in Http-only cookies for session management
 */
export const storeOAuthTokens = async (jwt: string, refreshToken?: string) => {
    const frontendApiUrl = process.env.NEXT_PUBLIC_FRONTEND_API_URL;

    if (!frontendApiUrl) {
        throw new Error("Failed to store tokens: FRONTEND_API_URL is not defined.");
    }

    const setOAuthCookiesUrl = `${frontendApiUrl}/api/frontend/oauth/set-oauth-cookies`;

    try {
        await axios.post(setOAuthCookiesUrl, { jwt, refreshToken });
    } catch (error) {
        throw new Error(`Failed to store tokens in cookies: ${error.response?.data?.message || error.message}`);
    }
};

/**
 * Add JWT, JWT expiration timestamp and Litus refresh token to a response as http-only cookies
 */
export const addOAuthCookiesToResponse = (response : NextResponse, jwt: string, refreshToken?: string) => {
    const expirationTime = getJWTExpiration(jwt);

    if (!expirationTime) {
        return NextResponse.json({ error: 'JWT token is missing expiration time' }, { status: 400 });
    }

    // Set JWT http-only cookie
    response.cookies.set({
        name: 'jwt',
        value: jwt,
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
    });

    // Set JWT expiration time http-only cookie
    // Stored separately so we don't have to do the decoding at every request to check if the JWT is expired
    response.cookies.set({
        name: 'jwt_expiration',
        value: expirationTime.toString(), // Store the JWT expiration Unix timestamp as a string
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
    });

    // Set Litus refresh token http-only cookie
    if (refreshToken) {
        response.cookies.set({
            name: 'litus_refresh',
            value: refreshToken,
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
        });
    }

    return response;
}

/**
 * Redirects the user to Litus where they should authenticate, after which the Litus authentication server
 * redirects back to the callback url.
 */
export const initiateLitusOAuthFlow = (router: AppRouterInstance, redirectTo: string) => {
    const clientId = process.env.NEXT_PUBLIC_LITUS_API_KEY;
    const frontendUri = process.env.NEXT_PUBLIC_FRONTEND_URL;
    const authorizationUri = process.env.NEXT_PUBLIC_LITUS_OAUTH_AUTHORIZE;

    if (!clientId || !frontendUri || !authorizationUri) {
        throw new Error("OAuth flow initiation failed: Missing environment variables.");
    }

    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    // Store for later verification of received code
    sessionStorage.setItem('code_verifier', codeVerifier);

    const randomState = crypto.randomBytes(16).toString('hex');
    const state = JSON.stringify({
        state: randomState,
        redirectTo: redirectTo,
    });

    // Store for later verification of received state
    sessionStorage.setItem('state', state);

    const params = new URLSearchParams({
        scope: 'openid profile email',
        response_type: 'code',
        client_id: clientId,
        redirect_uri: `${frontendUri}/oauth/callback`,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        state: encodeURIComponent(state),
    });
    const authUrl = `${authorizationUri}?${params.toString()}`;
    router.push(authUrl);
};

/**
 * Handles OAuth callback, exchanges code for tokens, and stores them
 */
export const LitusOAuthCallback = async (router: AppRouterInstance, searchParams: ReadonlyURLSearchParams): Promise<null> => {
    const code = searchParams.get('code');
    const codeVerifier = sessionStorage.getItem('code_verifier');
    const encodedState = searchParams.get('state');
    const storedState = sessionStorage.getItem('state');

    if (!codeVerifier) throw new Error('OAuth callback failed: Code verifier is missing.');
    if (!encodedState || encodedState !== storedState) throw new Error('OAuth callback failed: State mismatch, possible CSRF attack.');

    if (code && codeVerifier) {
        try {
            // Retrieve and store OAuth tokens
            const { accessToken, refreshToken } = await requestLitusTokens(code, codeVerifier);
            const jwt = await requestJWT(accessToken);
            await storeOAuthTokens(jwt, refreshToken);

            // Redirect to the redirect URL from the state parameter
            const parsedState = JSON.parse(storedState || '{}');
            const redirectTo = parsedState.redirectTo || '/';
            router.push(redirectTo);
        } catch (error) {
            throw new Error(`OAuth callback failed: ${error.message}`);
        }
    }

    return null;
};

/**
 * Refreshes JWT by exchanging the old Litus refresh token for new tokens.
 */
export const LitusOAuthRefresh = async (oldRefreshToken: string): Promise<{ newJwt: string; newRefreshToken: string }> => {
    try {
        const { newAccessToken, newRefreshToken } = await refreshLitusTokens(oldRefreshToken);
        const newJwt = await requestJWT(newAccessToken);
        return { newJwt, newRefreshToken };
    } catch (error) {
        throw new Error(`Token refresh failed: ${error.message}`);
    }
};
